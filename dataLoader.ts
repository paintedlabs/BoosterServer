/**
 * dataLoader.ts
 *
 * Handles fetching, validating, loading, and processing
 * the necessary data files (AllPrintings, Extended Sealed Data, Scryfall)
 * for the Booster Server.
 */

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import * as unzipper from 'unzipper';
import { pipeline } from 'stream/promises';
import type * as stream from 'stream'; // For ReadableStream type
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import logger from './logger'; // Import the logger
import * as ScryfallTypes from './index'; // Assuming index.ts defines Scryfall card types
import * as TcgCsvService from './tcgCsvService';
import * as TcgCsvTypes from './types';
import { StatusOr, isOk } from './src/core/status/src'; // Import StatusOr helpers

// -------------- CONFIG CONSTANTS --------------
// Read configuration from environment variables with defaults
const DATA_DIR = process.env.DATA_DIR || 'data';

// URLs to fetch if local files are missing
const ALL_PRINTINGS_ZIP_URL =
  process.env.ALL_PRINTINGS_ZIP_URL ||
  'https://mtgjson.com/api/v5/AllPrintings.json.zip';
const EXTENDED_DATA_URL =
  process.env.EXTENDED_DATA_URL ||
  'https://raw.githubusercontent.com/taw/magic-sealed-data/refs/heads/master/sealed_extended_data.json';
const SCRYFALL_METADATA_URL = 'https://api.scryfall.com/bulk-data'; // Fixed metadata endpoint

// Local file paths
const ALL_PRINTINGS_PATH = path.join(DATA_DIR, 'AllPrintings.json');
const EXTENDED_DATA_PATH = path.join(DATA_DIR, 'sealed_extended_data.json');
const SCRYFALL_DATA_PATH = path.join(DATA_DIR, 'scryfall_all_cards.json');

// -------------- INTERFACES --------------

// Interfaces from AllPrintings.json structure
export interface AllPrintings {
  meta: Meta;
  data: Record<string, MTGSet>;
}
interface Meta {
  version: string;
  date: string;
}

export interface MTGSet {
  baseSetSize: number;
  code: string;
  name: string;
  releaseDate: string;
  cards: CardSet[];
  tcgplayerGroupId?: number; // Added TCGPlayer Group ID
  // Add other MTGSet properties if needed
}

export interface CardSet {
  uuid: string;
  name: string;
  rarity: string;
  identifiers?: {
    scryfallId?: string;
    tcgplayerProductId?: string; // Explicitly add TCGPlayer ID
    [key: string]: any; // Keep other identifiers if necessary
  };
  // Add other CardSet properties if needed
}

// Interfaces from sealed_extended_data.json structure

// Represents the raw sheet structure found in the JSON file
interface RawExtendedSheet {
  total_weight: number;
  // Cards are an array of objects, each containing uuid, weight, and potentially other info
  cards: Array<{ uuid: string; weight: number; [key: string]: any }>;
}

// Represents the processed sheet card structure used for picking
export interface ExtendedSheetCard {
  // Renamed from ProcessedSheetCard
  uuid: string;
  weight: number;
}

// Represents the processed sheet structure used after loading
export interface ExtendedSheet {
  total_weight: number;
  balance_colors: boolean;
  foil: boolean;
  cards: ExtendedSheetCard[]; // Uses the processed card structure
}

// ExtendedSealedData now uses the *processed* sheet structure definition
// as this is what the application logic expects after loadAndProcessExtendedData runs.
export interface ExtendedSealedData {
  name: string;
  code: string;
  set_code: string;
  set_name: string;
  boosters: ExtendedBooster[];
  sheets: Record<string, ExtendedSheet>; // <-- Uses the processed ExtendedSheet type
  source_set_codes: string[];
  tcgplayerProductId?: number; // Add TCGPlayer ID for sealed products
  tcgMarketPrice?: number | null; // Ensure nullable
}

export interface ExtendedBooster {
  sheets: Record<string, number>; // Sheet Name -> Count
  weight: number;
}

// Removed ProcessedSheet and ProcessedSheetCard as they were renamed

// Combined Card Data structure (AllPrintings + Scryfall + TCG CSV Price)
export interface CombinedCard {
  allPrintingsData: CardSet;
  scryfallData?: ScryfallTypes.IScryfallCard; // Using interface from index.ts
  // Replace generic price with specific Normal/Foil prices from TCG CSV
  tcgNormalMarketPrice?: number | null;
  tcgFoilMarketPrice?: number | null;
  // tcgMarketPrice?: number; // Removed generic price field
}

// Structure returned by loadAllData
export interface LoadedData {
  allPrintings: AllPrintings | null;
  extendedDataArray: ExtendedSealedData[];
  combinedCards: Record<string, CombinedCard>; // MTGJson UUID -> CombinedCard
}

// -------------- HELPER FUNCTIONS: FILE ENSURE & LOAD --------------

async function ensureDirectoryExists(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    logger.info(`Creating data directory: ${dir}`);
    // Use synchronous mkdir here as it's part of setup and simpler
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function ensureAllPrintingsUnzipped(
  localJsonPath: string
): Promise<void> {
  if (fs.existsSync(localJsonPath)) {
    logger.info(`Found local AllPrintings JSON: ${localJsonPath}.`);
    return;
  }

  await ensureDirectoryExists(localJsonPath);
  logger.info(`AllPrintings JSON not found locally: ${localJsonPath}`);
  logger.info(
    `Attempting to fetch and unzip from: ${ALL_PRINTINGS_ZIP_URL} ...`
  );

  try {
    const response = await fetch(ALL_PRINTINGS_ZIP_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch '${ALL_PRINTINGS_ZIP_URL}': ${response.status} ${response.statusText}`
      );
    }

    logger.info('AllPrintings zip download complete, unzipping...');
    const zipStream = response.body;
    if (!zipStream) {
      logger.error('Response body is null, cannot unzip AllPrintings.');
      throw new Error('Response body is null, cannot unzip.');
    }

    await pipeline(
      zipStream as unknown as stream.Readable, // Cast needed for node-fetch body
      unzipper.ParseOne(/AllPrintings\.json$/i), // Find the correct entry case-insensitively
      fs.createWriteStream(localJsonPath)
    );

    logger.info(
      `Successfully saved unzipped AllPrintings to: ${localJsonPath}`
    );
  } catch (error) {
    logger.error({ err: error }, 'Error during AllPrintings download/unzip');
    // Optionally try fetching the non-zipped version as a fallback?
    // await ensureFileExists(localJsonPath, ALL_PRINTINGS_URL);
    throw error; // Re-throw after logging
  }
}

async function ensureFileExistsHelper(
  localPath: string,
  remoteUrl: string,
  isFileOptional: boolean = false
): Promise<boolean> {
  if (fs.existsSync(localPath)) {
    logger.info(`Found local file: ${localPath}.`);
    return true;
  }

  await ensureDirectoryExists(localPath);
  logger.info(`File not found locally: ${localPath}`);
  logger.info(`Fetching from: ${remoteUrl} ...`);

  try {
    const resp = await fetch(remoteUrl);
    if (!resp.ok) {
      throw new Error(
        `Failed to fetch '${remoteUrl}': ${resp.status} ${resp.statusText}`
      );
    }

    const textData = await resp.text();
    fs.writeFileSync(localPath, textData, 'utf-8');
    logger.info(`Successfully saved file to: ${localPath}`);
    return true;
  } catch (error) {
    logger.error({ err: error, url: remoteUrl }, `Failed to download file`);
    if (isFileOptional) {
      logger.warn(`Could not fetch optional file: ${localPath}`);
      return false;
    } else {
      throw error; // Re-throw if the file is mandatory
    }
  }
}

// Stream the Scryfall all-cards download to avoid large memory usage
async function ensureScryfallAllCards(localPath: string): Promise<void> {
  if (fs.existsSync(localPath)) {
    logger.info(`Scryfall all-cards file found locally: ${localPath}`);
    return;
  }

  await ensureDirectoryExists(localPath);
  logger.info(`Scryfall all-cards not found locally: ${localPath}`);

  // --- Fetch Scryfall Bulk Data Metadata ---
  let downloadUri = '';
  try {
    logger.info(
      `Fetching Scryfall bulk data list from: ${SCRYFALL_METADATA_URL}...`
    );
    const metaResponse = await fetch(SCRYFALL_METADATA_URL);
    if (!metaResponse.ok) {
      throw new Error(
        `Scryfall metadata fetch failed: ${metaResponse.status} ${metaResponse.statusText}`
      );
    }
    const metaData: any = await metaResponse.json(); // Use 'any' for now, or define a proper type

    // Find the entry for "all_cards"
    const allCardsEntry = metaData?.data?.find(
      (item: any) => item.type === 'all_cards'
    );
    if (!allCardsEntry || !allCardsEntry.download_uri) {
      logger.error(
        { metaData },
        "Could not find 'all_cards' download URI in Scryfall metadata."
      );
      throw new Error(
        "Could not find 'all_cards' download URI in Scryfall metadata."
      );
    }

    downloadUri = allCardsEntry.download_uri;
    logger.info(`Found Scryfall 'all_cards' download URI: ${downloadUri}`);
  } catch (error) {
    logger.error(
      { err: error },
      'Failed to fetch or parse Scryfall bulk data metadata.'
    );
    throw error; // Re-throw
  }

  // --- Download the actual bulk data file using the obtained URI ---
  logger.info(
    `Downloading Scryfall bulk data from: ${downloadUri} (this may take a while)...`
  );

  const response = await fetch(downloadUri);
  if (!response.ok) {
    throw new Error(
      `Scryfall bulk data download failed: ${response.status} ${response.statusText}`
    );
  }

  if (!response.body) {
    throw new Error('Scryfall bulk data response body is null.');
  }

  logger.info('Scryfall bulk download complete. Writing to file...');

  try {
    const fileStream = fs.createWriteStream(localPath);
    // Cast needed as node-fetch body type might not perfectly match Node stream types
    await pipeline(response.body as unknown as stream.Readable, fileStream);
    logger.info(`Successfully wrote Scryfall data to ${localPath}`);
  } catch (error) {
    logger.error(
      { err: error, path: localPath },
      `Error writing Scryfall data`
    );
    // Attempt cleanup of potentially partial file
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
        logger.warn(`Deleted potentially partial Scryfall file: ${localPath}`);
      } catch (e) {
        logger.error(`Failed to delete partial Scryfall file: ${localPath}`, {
          err: e,
        });
      }
    }
    throw error; // Re-throw after cleanup attempt
  }
}

// -------------- HELPER FUNCTIONS: LOAD INTO MEMORY --------------

function loadAllPrintings(filePath: string): AllPrintings | null {
  logger.info(`Loading AllPrintings from ${filePath}...`);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as AllPrintings;
    logger.info(
      `Successfully loaded AllPrintings version ${parsed.meta.version} (${parsed.meta.date}). Found ${Object.keys(parsed.data).length} sets.`
    );
    return parsed;
  } catch (err) {
    logger.error(
      { err, path: filePath },
      `FATAL: Failed to load or parse AllPrintings`
    );
    return null;
  }
}

/**
 * Loads the extended sealed data and processes the sheets
 * from the { uuid: weight } format to the [{ uuid, weight }, ...] format.
 * Returns an array of the processed data structure.
 */
function loadAndProcessExtendedData(filePath: string): ExtendedSealedData[] {
  logger.info(`Loading Extended Sealed Data from ${filePath}...`);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    // Parse initially assuming the raw structure might be slightly different
    // if the source JSON structure is strictly typed, use that type here.
    const dataArray: any[] = JSON.parse(raw);
    const processedDataArray: ExtendedSealedData[] = [];

    // Process sheets for easier weighted random selection
    for (const product of dataArray) {
      // Create a new object conforming to ExtendedSealedData
      const processedProduct: ExtendedSealedData = {
        ...product, // Copy existing properties
        sheets: {}, // Initialize sheets to be filled with processed ones
      };
      const processedSheets: Record<string, ExtendedSheet> = {}; // Use the final type

      // Ensure product.sheets exists and is an object
      if (product.sheets && typeof product.sheets === 'object') {
        for (const sheetName in product.sheets) {
          // Use 'any' temporarily for the raw sheet to handle variability before validation
          const originalSheetData: any = product.sheets[sheetName];
          // Basic validation of the original sheet structure
          if (
            !originalSheetData ||
            !Array.isArray(originalSheetData.cards) ||
            typeof originalSheetData.total_weight !== 'number'
          ) {
            logger.warn(
              { productCode: product.code, sheetName },
              `Skipping invalid raw sheet data structure`
            );
            continue;
          }
          // Cast to RawExtendedSheet now that basic structure seems okay
          const originalSheet = originalSheetData as RawExtendedSheet;

          const processedCards: ExtendedSheetCard[] = []; // Use the final type
          let calculatedTotalWeight = 0;
          // Iterate through the array of card objects
          for (const cardObject of originalSheet.cards) {
            // Validate the structure of the card object within the array
            if (
              typeof cardObject !== 'object' ||
              cardObject === null ||
              typeof cardObject.uuid !== 'string' ||
              typeof cardObject.weight !== 'number'
            ) {
              logger.warn(
                { productCode: product.code, sheetName, cardObject },
                `Skipping card object with invalid structure within sheet array`
              );
              continue;
            }

            const uuid = cardObject.uuid;
            const weight = cardObject.weight;

            // Ensure extracted weight is positive
            if (weight > 0) {
              processedCards.push({ uuid, weight });
              calculatedTotalWeight += weight;
            }
          }

          // Validate calculated weight matches the provided total_weight
          if (calculatedTotalWeight !== originalSheet.total_weight) {
            // Log mismatch only if calculated > 0; if 0, previous warnings cover it.
            if (calculatedTotalWeight > 0) {
              logger.warn(
                {
                  productCode: product.code,
                  sheetName,
                  expected: originalSheet.total_weight,
                  calculated: calculatedTotalWeight,
                },
                `Mismatch in sheet total_weight. Using calculated weight.`
              );
            }
          }
          // Only add sheet if it has cards and positive weight
          if (processedCards.length > 0 && calculatedTotalWeight > 0) {
            processedSheets[sheetName] = {
              total_weight: calculatedTotalWeight, // Use calculated weight for safety
              balance_colors: false,
              foil: false,
              cards: processedCards,
            };
          } else {
            logger.warn(
              {
                productCode: product.code,
                sheetName,
                cardCount: processedCards.length,
                weight: calculatedTotalWeight,
              },
              `Sheet resulted in no cards or zero total weight after processing. Skipping sheet.`
            );
          }
        }
      }
      // Assign the processed sheets to the new product object
      processedProduct.sheets = processedSheets;
      processedDataArray.push(processedProduct);
    }

    logger.info(
      `Successfully loaded and processed ${processedDataArray.length} sealed product definitions.`
    );
    return processedDataArray;
  } catch (err) {
    logger.error(
      { err, path: filePath },
      `FATAL: Failed to load or parse extended data`
    );
    return []; // Return empty array on fatal error
  }
}

/**
 * Parses the giant Scryfall file in a streaming way to build a map
 * of only the cards we actually need (based on scryfallIds from AllPrintings).
 */
async function loadScryfallAllCardsStreamed(
  filePath: string,
  neededScryfallIds: Set<string>
): Promise<Record<string, ScryfallTypes.IScryfallCard>> {
  if (neededScryfallIds.size === 0) {
    logger.warn(
      'No Scryfall IDs were identified as needed. Skipping Scryfall load.'
    );
    return {};
  }

  logger.info(
    `Streaming parse of Scryfall data from ${filePath}. Looking for ${neededScryfallIds.size} specific card IDs.`
  );

  const scryfallMap: Record<string, ScryfallTypes.IScryfallCard> = {};
  let processedCount = 0;
  const startTime = Date.now();

  const pipelineStream = chain([
    fs.createReadStream(filePath),
    parser({ jsonStreaming: true }),
    streamArray(),
  ]);

  try {
    logger.debug('Starting Scryfall stream processing loop...'); // Log before loop
    for await (const chunk of pipelineStream) {
      processedCount++;
      const card = chunk.value as ScryfallTypes.IScryfallCard;

      // Basic validation of card object
      if (card && typeof card === 'object' && card.id) {
        if (neededScryfallIds.has(card.id)) {
          scryfallMap[card.id] = card;
          // Optional: remove ID from set to stop early if all found?
          // neededScryfallIds.delete(card.id);
          // if (neededScryfallIds.size === 0) break; // Optimization
        }
      } else if (
        processedCount === 1 &&
        !(card && typeof card === 'object' && card.id)
      ) {
        // Check the first object only more robustly
        logger.warn(
          { firstObject: card },
          "First object in Scryfall stream doesn't look like a valid card"
        );
      }

      // Progress logging
      if (processedCount % 50000 === 0) {
        // Log less frequently
        const elapsed = (Date.now() - startTime) / 1000;
        logger.debug(
          `  ... processed ${processedCount} Scryfall objects, found ${Object.keys(scryfallMap).length}/${neededScryfallIds.size} needed cards (${elapsed.toFixed(1)}s)`
        );
      }
    }
    logger.debug('Finished Scryfall stream processing loop.'); // Log after loop
  } catch (streamError) {
    logger.error(
      { err: streamError },
      'Error during Scryfall stream processing'
    );
    throw streamError; // Propagate error
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  logger.info(
    `Scryfall stream finished in ${duration.toFixed(1)}s. Processed ${processedCount} objects.`
  );
  logger.info(
    `Found ${Object.keys(scryfallMap).length} matching Scryfall cards out of ${neededScryfallIds.size} needed.`
  );
  // Log if any needed cards were not found
  if (Object.keys(scryfallMap).length < neededScryfallIds.size) {
    logger.warn(
      `Could not find Scryfall data for ${neededScryfallIds.size - Object.keys(scryfallMap).length} IDs.`
    );
    // Optionally log the missing IDs (can be very verbose)
    // const foundIds = new Set(Object.keys(scryfallMap));
    // const missingIds = [...neededScryfallIds].filter(id => !foundIds.has(id));
    // logger.warn({ missingIds: missingIds.slice(0, 10) }, "Sample missing Scryfall IDs"); // Log first few
  }

  logger.info('loadScryfallAllCardsStreamed function finishing.'); // Log before return
  return scryfallMap;
}

// -------------- HELPER FUNCTION: MERGING --------------

/**
 * Builds the combinedCards map by:
 * 1. Identifying all unique Scryfall IDs needed from AllPrintings.
 * 2. Loading the required Scryfall card data using the streaming parser.
 * 3. Merging the AllPrintings card data with the corresponding Scryfall data.
 */
async function buildCombinedCards(
  allPrintings: AllPrintings,
  scryfallFilePath: string
): Promise<Record<string, CombinedCard>> {
  logger.info('Starting combined card data build...');
  const combinedCardsMap: Record<string, CombinedCard> = {};

  // 1. Collect needed Scryfall IDs from AllPrintings
  const neededScryfallIds = new Set<string>();
  let allPrintingsCardCount = 0;
  for (const setCode of Object.keys(allPrintings.data)) {
    const setObj = allPrintings.data[setCode];
    if (setObj?.cards) {
      for (const card of setObj.cards) {
        allPrintingsCardCount++;
        const scryId = card.identifiers?.scryfallId;
        if (scryId) {
          neededScryfallIds.add(scryId);
        }
      }
    }
  }
  logger.info(
    `Collected ${neededScryfallIds.size} unique Scryfall IDs from ${allPrintingsCardCount} card printings in AllPrintings.`
  );

  // 2. Load Scryfall data for needed IDs
  logger.info('Calling loadScryfallAllCardsStreamed...'); // Log before await
  const scryfallMap = await loadScryfallAllCardsStreamed(
    scryfallFilePath,
    neededScryfallIds
  );
  logger.info('Returned from loadScryfallAllCardsStreamed.'); // Log after await

  // 3. Merge AllPrintings and Scryfall data
  let mergedCount = 0;
  let missingScryfallCount = 0;
  for (const setCode of Object.keys(allPrintings.data)) {
    const setObj = allPrintings.data[setCode];
    if (setObj?.cards) {
      for (const card of setObj.cards) {
        const scryId = card.identifiers?.scryfallId;
        const scryData = scryId ? scryfallMap[scryId] : undefined;

        if (scryId && !scryData) {
          missingScryfallCount++;
          // Log only once per missing ID if needed
          // logger.warn({ scryfallId: scryId, cardName: card.name, setCode }, `Scryfall data missing for printing`);
        }

        // Store combined data using the MTGJSON UUID as the key
        combinedCardsMap[card.uuid] = {
          allPrintingsData: card,
          scryfallData: scryData, // Will be undefined if scryId was missing or not found
          // Initialize price fields to null - they will be populated later
          tcgNormalMarketPrice: null,
          tcgFoilMarketPrice: null,
        };
        mergedCount++;
      }
    }
  }
  logger.info(`Built combined data for ${mergedCount} card printings.`);
  if (missingScryfallCount > 0) {
    logger.warn(
      `Note: Scryfall data was not found for ${missingScryfallCount} printings (affecting ${neededScryfallIds.size - Object.keys(scryfallMap).length} unique card IDs).`
    );
  }

  return combinedCardsMap;
}

// -------------- HELPER FUNCTION: TCG CSV PRICE FETCHING --------------

/**
 * Fetches TCGPlayer group, product, and price data and applies market prices
 * to the provided combinedCardsMap and extendedDataArray.
 */
async function fetchAndApplyTcgPrices(
  allPrintings: AllPrintings,
  combinedCardsMap: Record<string, CombinedCard>,
  extendedDataArray: ExtendedSealedData[]
): Promise<void> {
  logger.info('--- Starting TCGPlayer Price Fetching and Application ---');

  // 1. Fetch all MTG groups (sets) from TCG CSV
  const groupsResult = await TcgCsvService.fetchGroups();
  if (!isOk(groupsResult)) {
    logger.error(
      {
        errorType: groupsResult.error.type,
        details: groupsResult.error,
      },
      'Failed to fetch TCGPlayer groups. Skipping price fetching.'
    );
    return;
  }
  const tcgGroups = groupsResult.value;
  const tcgGroupMap = new Map<number, TcgCsvTypes.TcgCsvGroup>(
    tcgGroups.map((g) => [g.groupId, g])
  );
  logger.info(`Fetched ${tcgGroupMap.size} TCGPlayer groups.`);

  // Create a consolidated price map across all groups for sealed lookup
  const consolidatedPriceMap = new Map<
    number,
    { normal?: number | null; foil?: number | null }
  >();

  // 2. Iterate through AllPrintings sets to find corresponding TCG groups
  let setsProcessedForPrices = 0;
  for (const setCode of Object.keys(allPrintings.data)) {
    const mtgSet = allPrintings.data[setCode];
    const tcgGroupId = mtgSet.tcgplayerGroupId;

    if (!tcgGroupId) {
      continue;
    }

    if (!tcgGroupMap.has(tcgGroupId)) {
      logger.warn(
        { setCode, tcgplayerGroupId: tcgGroupId },
        `TCGPlayer group data not found for groupId provided by MTGSet. Skipping.`
      );
      continue;
    }

    logger.info(
      `Processing TCG prices for Set: ${setCode} (Group ID: ${tcgGroupId})`
    );

    // 3. Fetch Products and Prices for the group
    const [productsResult, pricesResult] = await Promise.all([
      TcgCsvService.fetchProducts(tcgGroupId),
      TcgCsvService.fetchPrices(tcgGroupId),
    ]);

    if (!isOk(productsResult)) {
      logger.error(
        {
          errorType: productsResult.error.type,
          details: productsResult.error,
          setCode,
          tcgGroupId,
        },
        `Failed to fetch TCGPlayer products for group. Skipping prices for this set.`
      );
      continue;
    }
    const tcgProducts = productsResult.value;
    const tcgProductMap = new Map<number, TcgCsvTypes.TcgCsvProduct>(
      tcgProducts.map((p) => [p.productId, p])
    );

    if (!isOk(pricesResult)) {
      logger.error(
        {
          errorType: pricesResult.error.type,
          details: pricesResult.error,
          setCode,
          tcgGroupId,
        },
        `Failed to fetch TCGPlayer prices for group. Skipping prices for this set.`
      );
      continue;
    }
    const tcgPrices = pricesResult.value;

    // 4. Build a temporary price map for *this group* and merge into consolidated map
    const groupPriceMap = new Map<
      number,
      { normal?: number | null; foil?: number | null }
    >();
    for (const price of tcgPrices) {
      if (!groupPriceMap.has(price.productId)) {
        groupPriceMap.set(price.productId, {});
      }
      const entry = groupPriceMap.get(price.productId)!;
      const marketPrice = price.marketPrice;

      if (price.subTypeName === 'Normal') {
        entry.normal = marketPrice;
      } else if (price.subTypeName === 'Foil') {
        entry.foil = marketPrice;
      }
      // Also add to consolidated map
      if (!consolidatedPriceMap.has(price.productId)) {
        consolidatedPriceMap.set(price.productId, {});
      }
      const consolidatedEntry = consolidatedPriceMap.get(price.productId)!;
      if (price.subTypeName === 'Normal') {
        consolidatedEntry.normal = marketPrice;
      } else if (price.subTypeName === 'Foil') {
        consolidatedEntry.foil = marketPrice;
      }
    }

    // 5. Apply prices to CombinedCard map using the group-specific price map
    let cardsUpdated = 0;
    for (const card of mtgSet.cards) {
      const combinedCard = combinedCardsMap[card.uuid];
      if (!combinedCard) continue;

      const tcgProductId =
        combinedCard.allPrintingsData.identifiers?.tcgplayerProductId;
      if (!tcgProductId) continue;

      const prices = groupPriceMap.get(Number(tcgProductId));
      if (prices) {
        combinedCard.tcgNormalMarketPrice = prices.normal ?? null;
        combinedCard.tcgFoilMarketPrice = prices.foil ?? null;
        cardsUpdated++;
      }
    }
    if (cardsUpdated > 0) {
      logger.debug(`  Updated prices for ${cardsUpdated} cards in ${setCode}.`);
    }

    setsProcessedForPrices++;
  } // End of set loop

  // 6. Apply prices to ExtendedSealedData using the consolidated price map
  let sealedProductsUpdated = 0;
  for (const sealedProduct of extendedDataArray) {
    const tcgProductId = sealedProduct.tcgplayerProductId;
    if (!tcgProductId) continue;

    const prices = consolidatedPriceMap.get(Number(tcgProductId)); // Use consolidated map here
    if (prices) {
      sealedProduct.tcgMarketPrice = prices.normal ?? prices.foil ?? null;
      if (sealedProduct.tcgMarketPrice !== null) {
        sealedProductsUpdated++;
      }
    }
  }
  if (sealedProductsUpdated > 0) {
    logger.info(`Updated prices for ${sealedProductsUpdated} sealed products.`);
  }

  logger.info(
    `--- Finished TCGPlayer Price Fetching. Processed ${setsProcessedForPrices} sets. ---`
  );
}

// -------------- MAIN EXPORTED FUNCTION --------------

/**
 * Ensures all necessary data files are present (downloading if needed),
 * loads them into memory, processes them, fetches prices, and returns the final data structures.
 */
export async function loadAllData(): Promise<LoadedData> {
  logger.info('--- Starting Data Loading Process ---');

  // Ensure data directory exists
  await ensureDirectoryExists(ALL_PRINTINGS_PATH);

  // 1. Ensure and Load AllPrintings
  await ensureAllPrintingsUnzipped(ALL_PRINTINGS_PATH);
  const allPrintingsData = loadAllPrintings(ALL_PRINTINGS_PATH);
  if (!allPrintingsData) {
    throw new Error('Failed to load AllPrintings.json. Server cannot start.');
  }

  // 2. Ensure and Load Extended Sealed Data
  const extendedDataExists = await ensureFileExistsHelper(
    EXTENDED_DATA_PATH,
    EXTENDED_DATA_URL,
    false
  );
  if (!extendedDataExists) {
    throw new Error(
      'Failed to load sealed_extended_data.json. Server cannot start.'
    );
  }
  const extendedDataArray = loadAndProcessExtendedData(EXTENDED_DATA_PATH);
  if (!extendedDataArray || extendedDataArray.length === 0) {
    logger.warn('Extended sealed data is empty or failed to load properly.');
  }

  // 3. Ensure Scryfall Bulk Data
  await ensureScryfallAllCards(SCRYFALL_DATA_PATH);

  // 4. Build Combined Card Map (requires AllPrintings and Scryfall path)
  const combinedCardsMap = await buildCombinedCards(
    allPrintingsData,
    SCRYFALL_DATA_PATH
  );

  // 5. Fetch and Apply TCGPlayer Prices
  await fetchAndApplyTcgPrices(
    allPrintingsData,
    combinedCardsMap,
    extendedDataArray // Pass the array to be potentially modified
  );

  logger.info('--- Data Loading Process Finished Successfully ---');

  return {
    allPrintings: allPrintingsData,
    extendedDataArray: extendedDataArray,
    combinedCards: combinedCardsMap,
  };
}
