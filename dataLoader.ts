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
import { parser as jsonParser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import logger from './logger'; // Import the logger
import * as ScryfallTypes from './index'; // Assuming index.ts defines Scryfall card types
import * as TcgCsvService from './tcgCsvService';
import { TcgCsvProduct } from './types';
import { StatusOr, isOk } from './src/core/status/src'; // Import StatusOr helpers
import {
  UnifiedCard,
  UnifiedSet,
  UnifiedSealedProduct,
  UnifiedData,
  UnifiedSealedProductCard,
  UnifiedSealedProductContents,
  BoosterConfig,
  BoosterSheet,
  PriceInfo,
  TCGPlayerData,
  PurchaseUrls,
  Identifiers,
  Legalities,
  LeadershipSkills,
  ImageUris,
} from './src/types/unified/unifiedTypes';
import {
  SealedProductContents as MtgjsonSealedProductContents,
  SealedProductCard as MtgjsonSealedProductCard,
  SealedProduct as MtgjsonSealedProduct,
  MTGSet,
  BoosterConfig as MtgjsonBoosterConfig,
  BoosterSheet as MtgjsonBoosterSheet,
  CardAtomic,
  CardSet,
  Identifiers as MtgjsonIdentifiers,
  PurchaseUrls as MtgjsonPurchaseUrls,
} from './src/types/mtgjson/mtgjsonTypes';
import {
  ExtendedSealedData,
  ExtendedBooster,
  ExtendedSealedDataFile,
  ExtendedSheet,
  ExtendedSheetCard,
} from './src/types/extendedsealed/extendedSealedTypes';
import {
  SealedProduct,
  SealedProductCard,
} from './src/types/sealed/sealedProductTypes';
import { IScryfallCard } from './src/types/scryfall/IScryfallCard';

// -------------- CONFIG CONSTANTS --------------
// Read configuration from environment variables with defaults
const DATA_DIR = process.env.DATA_DIR || 'data'; // Data directory

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

// Add new constant for booster configurations directory
const BOOSTERS_DIR = path.join(DATA_DIR, 'boosters');

// -------------- INTERFACES --------------

// Represents the raw sheet structure found in the JSON file
interface RawBoosterSheet {
  totalWeight: number;
  balanceColors: boolean;
  foil: boolean;
  fixed: boolean;
  cards: Array<{
    uuid: string;
    weight: number;
  }>;
}

// Structure returned by loadAllData
export interface LoadedData {
  allPrintings: UnifiedData | null;
  extendedDataArray: ExtendedSealedData[];
  combinedCards: Record<string, UnifiedCard>;
  sealedProducts: Record<string, UnifiedSealedProduct>;
  codeToUuidMap: Record<string, string>;
  sets: UnifiedSet[];
}

interface AllPrintingsFile {
  data: Record<string, MTGSet>;
  meta: {
    date: string;
    version: string;
  };
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

function loadAllPrintings(filePath: string): AllPrintingsFile | null {
  logger.info(`Loading AllPrintings from ${filePath}...`);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as AllPrintingsFile;
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

// Helper function to calculate total weight from cards
function calculateTotalWeight(cards: Array<{ weight: number }>): number {
  return cards.reduce((sum, card) => sum + card.weight, 0);
}

// Process a raw sheet into the expected format
function processRawSheet(sheet: MtgjsonBoosterSheet): BoosterSheet {
  return {
    totalWeight: sheet.totalWeight,
    balanceColors: sheet.balanceColors || false,
    foil: sheet.foil || false,
    fixed: sheet.fixed || false,
    cards: Object.entries(sheet.cards).map(([uuid, weight]) => ({
      uuid,
      weight: Number(weight),
    })),
  };
}

// Helper function to validate and fix sheet weights
function validateAndFixSheetWeights(sheet: RawBoosterSheet): RawBoosterSheet {
  const calculatedWeight = sheet.cards.reduce(
    (sum, card) => sum + card.weight,
    0
  );

  if (calculatedWeight !== sheet.totalWeight) {
    // logger.info(
    //   {
    //     expected: sheet.totalWeight,
    //     calculated: calculatedWeight,
    //   },
    //   `Fixing sheet totalWeight mismatch`
    // );

    return {
      ...sheet,
      totalWeight: calculatedWeight,
    };
  }

  return sheet;
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
    const dataArray: any[] = JSON.parse(raw);
    const processedDataArray: ExtendedSealedData[] = [];

    logger.debug(
      {
        filePath,
        productCount: dataArray.length,
        sampleProduct: dataArray[0]
          ? {
              uuid: dataArray[0].uuid,
              name: dataArray[0].name,
              hasBoosters: !!dataArray[0].boosters,
              boosterCount: dataArray[0].boosters?.length,
              hasSheets: !!dataArray[0].sheets,
              sheetCount: Object.keys(dataArray[0].sheets || {}).length,
            }
          : null,
      },
      'Loaded raw extended data'
    );

    // Process sheets for easier weighted random selection
    for (const product of dataArray) {
      // Create a new object conforming to ExtendedSealedData
      const processedProduct: ExtendedSealedData = {
        ...product, // Copy existing properties including boosters
        sheets: {}, // Initialize sheets to be filled with processed ones
      };

      logger.trace(
        {
          productUuid: product.uuid,
          productName: product.name,
          hasBoosters: !!product.boosters,
          boosterCount: product.boosters?.length,
          hasSheets: !!product.sheets,
          sheetCount: Object.keys(product.sheets || {}).length,
          boosterDetails: product.boosters?.map((b: ExtendedBooster) => ({
            weight: b.weight,
            sheetCount: Object.keys(b.sheets || {}).length,
          })),
        },
        'Processing product'
      );

      const processedSheets: Record<string, ExtendedSheet> = {};
      // Process each sheet in the product
      if (product.sheets) {
        for (const [sheetName, sheetData] of Object.entries(product.sheets)) {
          const originalSheet = sheetData as {
            cards: Record<string, number>;
            totalWeight: number;
            balanceColors?: boolean;
            foil?: boolean;
            fixed?: boolean;
          };

          // Convert the sheet's card data from { uuid: weight } to [{ uuid, weight }, ...]
          const processedCards: ExtendedSheetCard[] = [];
          let calculatedTotalWeight = 0;

          if (originalSheet.cards) {
            for (const [cardUuid, weight] of Object.entries(
              originalSheet.cards
            )) {
              if (weight > 0) {
                processedCards.push({
                  uuid: cardUuid,
                  weight: weight,
                });
                calculatedTotalWeight += weight;
              }
            }
          }

          // Validate calculated weight matches the provided totalWeight
          if (calculatedTotalWeight !== originalSheet.totalWeight) {
            // Log mismatch only if calculated > 0; if 0, previous warnings cover it.
            if (calculatedTotalWeight > 0) {
              logger.warn(
                {
                  productCode: product.code,
                  sheetName,
                  expected: originalSheet.totalWeight,
                  calculated: calculatedTotalWeight,
                },
                `Mismatch in sheet totalWeight. Using calculated weight.`
              );
            }
          }

          // Only add sheet if it has cards and positive weight
          if (processedCards.length > 0 && calculatedTotalWeight > 0) {
            processedSheets[sheetName] = {
              totalWeight: calculatedTotalWeight, // Use calculated weight for safety
              balanceColors: originalSheet.balanceColors || false,
              foil: originalSheet.foil || false,
              fixed: originalSheet.fixed || false,
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

      logger.trace(
        {
          productUuid: product.uuid,
          productName: product.name,
          hasBoosters: !!processedProduct.boosters,
          boosterCount: processedProduct.boosters?.length,
          hasSheets: !!processedProduct.sheets,
          sheetCount: Object.keys(processedProduct.sheets || {}).length,
          sheetDetails: Object.entries(processedProduct.sheets).map(
            ([name, sheet]) => ({
              name,
              cardCount: sheet.cards.length,
              totalWeight: sheet.totalWeight,
              balanceColors: sheet.balanceColors,
              foil: sheet.foil,
              fixed: sheet.fixed,
            })
          ),
          boosterDetails: processedProduct.boosters?.map(
            (b: ExtendedBooster) => ({
              weight: b.weight,
              sheetCount: Object.keys(b.sheets || {}).length,
            })
          ),
        },
        'Processed product'
      );

      processedDataArray.push(processedProduct);
    }

    logger.info(
      {
        productCount: processedDataArray.length,
        productsWithBoosters: processedDataArray.filter(
          (p) => p.boosters?.length > 0
        ).length,
        productsWithSheets: processedDataArray.filter(
          (p) => Object.keys(p.sheets || {}).length > 0
        ).length,
      },
      'Successfully loaded and processed sealed product definitions'
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
): Promise<Record<string, IScryfallCard>> {
  if (neededScryfallIds.size === 0) {
    logger.warn(
      'No Scryfall IDs were identified as needed. Skipping Scryfall load.'
    );
    return {};
  }

  logger.info(
    `Streaming parse of Scryfall data from ${filePath}. Looking for ${neededScryfallIds.size} specific card IDs.`
  );

  const scryfallMap: Record<string, IScryfallCard> = {};
  let processedCount = 0;
  const startTime = Date.now();

  const pipelineStream = chain([
    fs.createReadStream(filePath),
    jsonParser({ jsonStreaming: true }),
    streamArray(),
  ]);

  try {
    logger.debug('Starting Scryfall stream processing loop...'); // Log before loop
    for await (const chunk of pipelineStream) {
      processedCount++;
      const card = chunk.value as IScryfallCard;

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

// -------------- HELPER FUNCTION: MERGING & CONVERSION --------------

// Helper: Convert MTGJSON SealedProductContents to UnifiedSealedProductContents
function convertMtgjsonContentsToUnified(
  mtgjsonContents: MtgjsonSealedProductContents
): UnifiedSealedProductContents {
  const convertCard = (
    card: NonNullable<MtgjsonSealedProductContents['card']>[0]
  ): UnifiedSealedProductCard => ({
    foil: card.foil || false,
    name: card.name,
    number: card.number || '',
    set: card.set || '',
    uuid: card.uuid,
  });

  return {
    card: mtgjsonContents.card?.map(convertCard) || [],
    deck:
      mtgjsonContents.deck?.map((deck) => ({
        name: deck.name || '',
        set: deck.set || '',
      })) || [],
    other:
      mtgjsonContents.other?.map((other) => ({ name: other.name || '' })) || [],
    pack:
      mtgjsonContents.pack?.map((pack) => ({
        code: pack.code || '',
        set: pack.set || '',
      })) || [],
    sealed:
      mtgjsonContents.sealed?.map((sealed) => ({
        count: sealed.count || 0,
        name: sealed.name || '',
        set: sealed.set || '',
        uuid: sealed.uuid || '',
      })) || [],
    variable:
      mtgjsonContents.variable?.map((variable) => ({
        configs: variable.configs?.map(convertMtgjsonContentsToUnified) || [],
      })) || [],
  };
}

// Helper: Convert Mtgjson.Identifiers to Unified.Identifiers
function convertMtgjsonIdentifiersToUnified(
  ids?: MtgjsonIdentifiers
): Identifiers {
  return {
    mtgjsonV4Id: ids?.mtgjsonV4Id || '',
    mtgjsonFoilVersionId: ids?.mtgjsonFoilVersionId || '',
    mtgjsonNonFoilVersionId: ids?.mtgjsonNonFoilVersionId || '',
    scryfallId: ids?.scryfallId || '',
    scryfallOracleId: ids?.scryfallOracleId || '',
    scryfallIllustrationId: ids?.scryfallIllustrationId || '',
    scryfallCardBackId: ids?.scryfallCardBackId || '',
    tcgplayerProductId: ids?.tcgplayerProductId || '',
    tcgplayerEtchedProductId: ids?.tcgplayerEtchedProductId || '',
    cardKingdomId: ids?.cardKingdomId || '',
    cardKingdomFoilId: ids?.cardKingdomFoilId || '',
    cardKingdomEtchedId: ids?.cardKingdomEtchedId || '',
    cardsphereId: ids?.cardsphereId || '',
    cardsphereFoilId: ids?.cardsphereFoilId || '',
    cardtraderId: ids?.cardtraderId || '',
    mcmId: ids?.mcmId || '',
    mcmMetaId: ids?.mcmMetaId || '',
    mtgoId: ids?.mtgoId || '',
    mtgoFoilId: ids?.mtgoFoilId || '',
    multiverseId: ids?.multiverseId || '',
  };
}

// Helper: Convert Mtgjson.PurchaseUrls to Unified.PurchaseUrls
function convertMtgjsonPurchaseUrlsToUnified(
  urls?: MtgjsonPurchaseUrls
): PurchaseUrls {
  return {
    cardKingdom: urls?.cardKingdom || '',
    cardKingdomFoil: urls?.cardKingdomFoil || '',
    cardKingdomEtched: urls?.cardKingdomEtched || '',
    cardmarket: urls?.cardmarket || '',
    tcgplayer: urls?.tcgplayer || '',
    tcgplayerEtched: urls?.tcgplayerEtched || '',
  };
}

// -------------- HELPER FUNCTION: PRICE CONVERSION --------------
function convertPriceToUnifiedPriceInfo(
  price: number | string | null
): PriceInfo {
  let numericPrice = 0;
  if (typeof price === 'number') {
    numericPrice = price;
  } else if (typeof price === 'string' && price !== '') {
    const parsed = parseFloat(price.replace(/[^\d.-]/g, ''));
    numericPrice = isNaN(parsed) ? 0 : parsed;
  }
  return {
    lowPrice: numericPrice,
    midPrice: numericPrice,
    highPrice: numericPrice,
    marketPrice: numericPrice,
    directLowPrice: numericPrice,
  };
}

// Helper function to safely convert marketPrice to number
function safeConvertMarketPrice(price: number | string | null): number | null {
  if (typeof price === 'number') {
    return price;
  } else if (typeof price === 'string' && price !== '') {
    const parsed = parseFloat(price.replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

// -------------- HELPER FUNCTION: TCG CSV PRICE FETCHING (Restored) --------------
async function fetchAndApplyTcgPrices(
  combinedCardsMap: Record<string, UnifiedCard>,
  extendedDataArray: ExtendedSealedData[],
  allTcgProducts: TcgCsvProduct[]
): Promise<void> {
  logger.info('--- Starting TCGPlayer Price Fetching and Application ---');
  const tcgProductPriceMap = new Map<
    string,
    { normal: number | null; foil: number | null }
  >();
  for (const product of allTcgProducts) {
    if (product.productId) {
      tcgProductPriceMap.set(product.productId.toString(), {
        normal:
          product.normalPrice ??
          safeConvertMarketPrice(product.marketPrice) ??
          product.avgPrice ??
          null,
        foil:
          product.foilPrice ??
          safeConvertMarketPrice(product.marketPrice) ??
          product.avgPrice ??
          null,
      });
    }
  }

  for (const card of Object.values(combinedCardsMap)) {
    const tcgId = card.identifiers.tcgplayerProductId;
    if (tcgId && tcgProductPriceMap.has(tcgId)) {
      const prices = tcgProductPriceMap.get(tcgId);
      if (prices) {
        if (!card.tcgplayer) {
          card.tcgplayer = {
            product_id: parseInt(tcgId),
            prices: {
              normal: convertPriceToUnifiedPriceInfo(null),
              foil: convertPriceToUnifiedPriceInfo(null),
            },
            image_url: '',
            clean_name: card.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
            extended_data: [],
            market_price: undefined,
          };
        }
        card.tcgplayer.prices.normal = convertPriceToUnifiedPriceInfo(
          prices.normal
        );
        card.tcgplayer.prices.foil = convertPriceToUnifiedPriceInfo(
          prices.foil
        );
        const tcgProductDetails = allTcgProducts.find(
          (p) => p.productId?.toString() === tcgId
        );
        if (tcgProductDetails) {
          card.tcgplayer.image_url = tcgProductDetails.imageUrl || '';
          card.tcgplayer.clean_name =
            tcgProductDetails.cleanName ||
            card.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          card.tcgplayer.market_price =
            safeConvertMarketPrice(tcgProductDetails.marketPrice) ?? undefined;
        }
      }
    }
  }

  for (const sealedProduct of extendedDataArray) {
    const productIdStr = sealedProduct.tcgplayerProductId?.toString();
    if (productIdStr && tcgProductPriceMap.has(productIdStr)) {
      const prices = tcgProductPriceMap.get(productIdStr);
      if (prices) {
        sealedProduct.tcgMarketPrice = prices.normal ?? undefined;
      }
    }
  }
  logger.info('--- Completed TCGPlayer Price Fetching and Application ---');
}

// -------------- HELPER FUNCTION: MERGING (Restored buildCombinedCards) --------------
async function buildCombinedCards(
  allPrintingsFile: AllPrintingsFile,
  scryfallDataMap: Record<string, IScryfallCard>
): Promise<Record<string, UnifiedCard>> {
  const combinedCards: Record<string, UnifiedCard> = {};

  // Process each set and its cards
  for (const [setCode, mtgSet] of Object.entries(allPrintingsFile.data)) {
    for (const mtgJsonCard of mtgSet.cards) {
      const scryfallCard =
        scryfallDataMap[mtgJsonCard.identifiers?.scryfallId || ''];
      const scryfallImageUris: ImageUris = scryfallCard?.image_uris
        ? {
            small: scryfallCard.image_uris.small || '',
            normal: scryfallCard.image_uris.normal || '',
            large: scryfallCard.image_uris.large || '',
            png: scryfallCard.image_uris.png || '',
            art_crop: scryfallCard.image_uris.art_crop || '',
            border_crop: scryfallCard.image_uris.border_crop || '',
          }
        : {
            small: '',
            normal: '',
            large: '',
            png: '',
            art_crop: '',
            border_crop: '',
          };

      const initialTcgPlayerData: TCGPlayerData = {
        product_id: parseInt(
          mtgJsonCard.identifiers?.tcgplayerProductId || '0'
        ),
        prices: {
          normal: convertPriceToUnifiedPriceInfo(null),
          foil: convertPriceToUnifiedPriceInfo(null),
        },
        image_url: '',
        clean_name: mtgJsonCard.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        extended_data: [],
      };

      const unifiedCard: UnifiedCard = {
        uuid: mtgJsonCard.uuid,
        name: mtgJsonCard.name,
        asciiName: mtgJsonCard.asciiName || '',
        setCode: mtgJsonCard.setCode || setCode,
        number: mtgJsonCard.number,
        layout: mtgJsonCard.layout || '',
        type: mtgJsonCard.type,
        types: mtgJsonCard.types || [],
        subtypes: mtgJsonCard.subtypes || [],
        supertypes: mtgJsonCard.supertypes || [],
        text: mtgJsonCard.text || '',
        flavorText: mtgJsonCard.flavorText || '',
        artist: mtgJsonCard.artist || '',
        artistIds: mtgJsonCard.artistIds || [],
        borderColor: mtgJsonCard.borderColor || '',
        frameVersion: mtgJsonCard.frameVersion || '',
        frameEffects: mtgJsonCard.frameEffects || [],
        language: mtgJsonCard.language || 'en',
        rarity: mtgJsonCard.rarity,
        cardParts: mtgJsonCard.cardParts || [],
        finishes: mtgJsonCard.finishes || [],
        identifiers: convertMtgjsonIdentifiersToUnified(
          mtgJsonCard.identifiers
        ),
        purchaseUrls: convertMtgjsonPurchaseUrlsToUnified(
          mtgJsonCard.purchaseUrls
        ),
        legalities: (mtgJsonCard.legalities as Legalities) || {},
        leadershipSkills:
          (mtgJsonCard.leadershipSkills as LeadershipSkills) || {
            brawl: false,
            commander: false,
            oathbreaker: false,
          },
        colors: mtgJsonCard.colors || [],
        colorIdentity: mtgJsonCard.colorIdentity || [],
        colorIndicator: mtgJsonCard.colorIndicator || [],
        manaCost: mtgJsonCard.manaCost || '',
        convertedManaCost: mtgJsonCard.convertedManaCost || 0,
        manaValue: mtgJsonCard.manaValue || 0,
        power: mtgJsonCard.power || '',
        toughness: mtgJsonCard.toughness || '',
        defense: mtgJsonCard.defense || '',
        loyalty: mtgJsonCard.loyalty || '',
        life: mtgJsonCard.life || '',
        hand: mtgJsonCard.hand || '',
        hasFoil: mtgJsonCard.hasFoil || false,
        hasNonFoil:
          mtgJsonCard.hasNonFoil !== undefined ? mtgJsonCard.hasNonFoil : true,
        isAlternative: mtgJsonCard.isAlternative || false,
        isFullArt: mtgJsonCard.isFullArt || false,
        isFunny: mtgJsonCard.isFunny || false,
        isOnlineOnly: mtgJsonCard.isOnlineOnly || false,
        isOversized: mtgJsonCard.isOversized || false,
        isPromo: mtgJsonCard.isPromo || false,
        isRebalanced: mtgJsonCard.isRebalanced || false,
        isReprint: mtgJsonCard.isReprint || false,
        isReserved: mtgJsonCard.isReserved || false,
        isStarter: mtgJsonCard.isStarter || false,
        isStorySpotlight: mtgJsonCard.isStorySpotlight || false,
        isTextless: mtgJsonCard.isTextless || false,
        isTimeshifted: mtgJsonCard.isTimeshifted || false,
        hasAlternativeDeckLimit: mtgJsonCard.hasAlternativeDeckLimit || false,
        hasContentWarning: mtgJsonCard.hasContentWarning || false,
        scryfallData: scryfallCard
          ? {
              id: scryfallCard.id,
              card_faces:
                scryfallCard.card_faces?.map((face) => ({
                  id: face.oracle_id || face.name,
                  image_uris: face.image_uris as ImageUris | undefined,
                })) || [],
              image_uris: scryfallCard.image_uris as ImageUris | undefined,
            }
          : undefined,
        image_uris: scryfallImageUris,
        foil_types: scryfallCard?.finishes || mtgJsonCard.finishes || [],
        keywords: scryfallCard?.keywords || [],
        oracle_text: scryfallCard?.oracle_text || mtgJsonCard.text || '',
        type_line: scryfallCard?.type_line || mtgJsonCard.type,
        released_at: scryfallCard?.released_at || mtgSet.releaseDate,
        highres_image: scryfallCard?.highres_image || false,
        image_status: scryfallCard?.image_status || '',
        tcgplayer: initialTcgPlayerData,
      };
      combinedCards[unifiedCard.uuid] = unifiedCard;
    }
  }
  logger.info(
    `Built combined cards map with ${Object.keys(combinedCards).length} cards.`
  );
  return combinedCards;
}

// -------------- HELPER FUNCTION: CONVERT ALLPRINTINGS TO UNIFIED (Restored) --------------
function convertToUnifiedData(
  allPrintingsFile: AllPrintingsFile,
  masterSealedProductsMap: Record<string, UnifiedSealedProduct>
): UnifiedData {
  logger.info('Converting AllPrintingsFile to UnifiedData...');
  const unifiedData: UnifiedData = {
    meta: {
      version: allPrintingsFile.meta.version,
      date: allPrintingsFile.meta.date,
    },
    data: {},
  };

  for (const [setCode, mtgSet] of Object.entries(allPrintingsFile.data)) {
    const unifiedCards: UnifiedCard[] = mtgSet.cards.map((card) => {
      return {
        uuid: card.uuid,
        name: card.name,
        asciiName: card.asciiName || '',
        setCode: card.setCode || setCode,
        number: card.number,
        layout: card.layout || '',
        type: card.type,
        types: card.types || [],
        subtypes: card.subtypes || [],
        supertypes: card.supertypes || [],
        text: card.text || '',
        flavorText: card.flavorText || '',
        artist: card.artist || '',
        artistIds: card.artistIds || [],
        borderColor: card.borderColor || '',
        frameVersion: card.frameVersion || '',
        frameEffects: card.frameEffects || [],
        language: card.language || 'en',
        rarity: card.rarity,
        cardParts: card.cardParts || [],
        finishes: card.finishes || [],
        identifiers: convertMtgjsonIdentifiersToUnified(card.identifiers),
        purchaseUrls: convertMtgjsonPurchaseUrlsToUnified(card.purchaseUrls),
        legalities: (card.legalities as Legalities) || {},
        leadershipSkills: (card.leadershipSkills as LeadershipSkills) || {
          brawl: false,
          commander: false,
          oathbreaker: false,
        },
        colors: card.colors || [],
        colorIdentity: card.colorIdentity || [],
        colorIndicator: card.colorIndicator || [],
        manaCost: card.manaCost || '',
        convertedManaCost: card.convertedManaCost || 0,
        manaValue: card.manaValue || 0,
        power: card.power || '',
        toughness: card.toughness || '',
        defense: card.defense || '',
        loyalty: card.loyalty || '',
        life: card.life || '',
        hand: card.hand || '',
        hasFoil: card.hasFoil || false,
        hasNonFoil: card.hasNonFoil !== undefined ? card.hasNonFoil : true,
        isAlternative: card.isAlternative || false,
        isFullArt: card.isFullArt || false,
        isFunny: card.isFunny || false,
        isOnlineOnly: card.isOnlineOnly || false,
        isOversized: card.isOversized || false,
        isPromo: card.isPromo || false,
        isRebalanced: card.isRebalanced || false,
        isReprint: card.isReprint || false,
        isReserved: card.isReserved || false,
        isStarter: card.isStarter || false,
        isStorySpotlight: card.isStorySpotlight || false,
        isTextless: card.isTextless || false,
        isTimeshifted: card.isTimeshifted || false,
        hasAlternativeDeckLimit: card.hasAlternativeDeckLimit || false,
        hasContentWarning: card.hasContentWarning || false,
        image_uris: {
          small: '',
          normal: '',
          large: '',
          png: '',
          art_crop: '',
          border_crop: '',
        },
        foil_types: card.finishes || [],
        keywords: [],
        oracle_text: card.text || '',
        type_line: card.type,
        released_at: mtgSet.releaseDate,
        highres_image: false,
        image_status: '',
        tcgplayer: {
          product_id: parseInt(card.identifiers?.tcgplayerProductId || '0'),
          prices: {
            normal: convertPriceToUnifiedPriceInfo(null),
            foil: convertPriceToUnifiedPriceInfo(null),
          },
          image_url: '',
          clean_name: card.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
          extended_data: [],
        },
      };
    });

    const setSealedProducts: UnifiedSealedProduct[] = [];
    if (mtgSet.sealedProduct && Array.isArray(mtgSet.sealedProduct)) {
      for (const productStub of mtgSet.sealedProduct) {
        if (masterSealedProductsMap[productStub.uuid]) {
          setSealedProducts.push(masterSealedProductsMap[productStub.uuid]);
        } else {
          logger.warn(
            { uuid: productStub.uuid, setCode },
            'Sealed product from MTGSet not found in master map during UnifiedData conversion.'
          );
        }
      }
    }

    const unifiedBoosterConfig: Record<string, BoosterConfig> = {};
    if (mtgSet.booster) {
      for (const [boosterName, mtgjsonBoosterValue] of Object.entries(
        mtgSet.booster
      )) {
        const unifiedSheets: Record<string, BoosterSheet> = {};
        if (mtgjsonBoosterValue.sheets) {
          for (const [sheetName, mtgjsonSheet] of Object.entries(
            mtgjsonBoosterValue.sheets
          )) {
            unifiedSheets[sheetName] = {
              totalWeight: mtgjsonSheet.totalWeight,
              balanceColors: mtgjsonSheet.balanceColors || false,
              foil: mtgjsonSheet.foil || false,
              fixed: mtgjsonSheet.fixed || false,
              cards: Object.entries(mtgjsonSheet.cards).map(
                ([uuid, weight]) => ({ uuid, weight: Number(weight) })
              ),
            };
          }
        }
        unifiedBoosterConfig[boosterName] = {
          name: boosterName,
          boosters: mtgjsonBoosterValue.boosters.map((b) => ({
            weight: b.weight,
            contents: Object.entries(b.contents).map(([sheet, count]) => ({
              sheet,
              count: Number(count),
            })),
          })),
          boostersTotalWeight: mtgjsonBoosterValue.boostersTotalWeight,
          sheets: unifiedSheets,
        };
      }
    }

    const translations: Record<string, string> = {};
    if (mtgSet.translations) {
      for (const [key, value] of Object.entries(mtgSet.translations)) {
        if (value !== null) {
          translations[key] = value;
        }
      }
    }

    unifiedData.data[setCode] = {
      baseSetSize: mtgSet.baseSetSize,
      block: mtgSet.block || '',
      booster: unifiedBoosterConfig,
      cards: unifiedCards,
      cardsphereSetId: mtgSet.cardsphereSetId || 0,
      code: mtgSet.code,
      codeV3: mtgSet.codeV3 || '',
      isForeignOnly: mtgSet.isForeignOnly || false,
      isFoilOnly: mtgSet.isFoilOnly || false,
      isNonFoilOnly: mtgSet.isNonFoilOnly || false,
      isOnlineOnly: mtgSet.isOnlineOnly || false,
      isPaperOnly: mtgSet.isPaperOnly || false,
      isPartialPreview: mtgSet.isPartialPreview || false,
      keyruneCode: mtgSet.keyruneCode || '',
      languages: mtgSet.languages || [],
      mcmId: mtgSet.mcmId || 0,
      mcmIdExtras: mtgSet.mcmIdExtras || 0,
      mcmName: mtgSet.mcmName || '',
      mtgoCode: mtgSet.mtgoCode || '',
      name: mtgSet.name,
      parentCode: mtgSet.parentCode || '',
      releaseDate: mtgSet.releaseDate,
      sealedProduct: setSealedProducts,
      tcgplayerGroupId: mtgSet.tcgplayerGroupId || 0,
      tokens: [],
      tokenSetCode: mtgSet.tokenSetCode || '',
      totalSetSize: mtgSet.totalSetSize,
      translations: translations,
      type: mtgSet.type,
    };
  }
  logger.info(
    `Converted AllPrintingsFile to UnifiedData. ${Object.keys(unifiedData.data).length} sets processed.`
  );
  return unifiedData;
}

function loadAndMergeAdditionalProducts(
  extendedDataArray: ExtendedSealedData[],
  productsFilePath: string
): ExtendedSealedData[] {
  try {
    const productsData = JSON.parse(fs.readFileSync(productsFilePath, 'utf8'));
    const additionalProducts = productsData.products || [];

    // Merge additional products into extendedDataArray
    for (const product of additionalProducts) {
      const existingData = extendedDataArray.find(
        (d) => d.uuid === product.uuid
      );
      if (existingData) {
        // Merge product data with existing data
        Object.assign(existingData, product);
      } else {
        // Add new product data
        extendedDataArray.push(product);
      }
    }

    return extendedDataArray;
  } catch (error) {
    logger.error('Error loading additional products:', error);
    return extendedDataArray;
  }
}

function convertSealedProductFromExtended(
  extendedProduct: ExtendedSealedData
): UnifiedSealedProduct {
  logger.debug(
    {
      productUuid: extendedProduct.uuid,
      productName: extendedProduct.name,
      hasBoosters: !!extendedProduct.boosters,
      boosterCount: extendedProduct.boosters?.length,
      hasSheets: !!extendedProduct.sheets,
      sheetCount: Object.keys(extendedProduct.sheets || {}).length,
    },
    'Converting extended product'
  );

  // Create base product
  const product: UnifiedSealedProduct = {
    uuid: extendedProduct.uuid,
    code: extendedProduct.code,
    name: extendedProduct.name,
    setCode: extendedProduct.set_code,
    category: extendedProduct.category || '',
    subtype: extendedProduct.subtype || '',
    cardCount: extendedProduct.cardCount || 0,
    productSize: extendedProduct.productSize || 0,
    releaseDate: extendedProduct.releaseDate || '',
    contents: extendedProduct.contents || {},
    identifiers: extendedProduct.identifiers || {},
    purchaseUrls: extendedProduct.purchaseUrls || {},
    tcgplayer: extendedProduct.tcgplayer || {
      product_id: 0,
      prices: {
        normal: {
          lowPrice: 0,
          midPrice: 0,
          highPrice: 0,
          marketPrice: 0,
          directLowPrice: 0,
        },
        foil: {
          lowPrice: 0,
          midPrice: 0,
          highPrice: 0,
          marketPrice: 0,
          directLowPrice: 0,
        },
      },
      image_url: '',
      clean_name: extendedProduct.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      extended_data: [],
    },
  };

  // Convert booster configuration if it exists
  if (extendedProduct.boosters && extendedProduct.boosters.length > 0) {
    logger.debug(
      {
        productUuid: extendedProduct.uuid,
        boosterCount: extendedProduct.boosters.length,
        firstBooster: extendedProduct.boosters[0],
      },
      'Converting booster configuration'
    );

    // Calculate total weight of all boosters
    const boostersTotalWeight = extendedProduct.boosters.reduce(
      (sum, b) => sum + b.weight,
      0
    );

    // Convert boosters to the unified format
    const boosters = extendedProduct.boosters.map((b: ExtendedBooster) => ({
      weight: b.weight,
      contents: Object.entries(b.sheets).map(([sheet, count]) => ({
        sheet,
        count,
      })),
    }));

    // Convert sheets to the unified format
    const sheets: Record<string, BoosterSheet> = {};
    if (extendedProduct.sheets) {
      for (const [sheetName, sheet] of Object.entries(extendedProduct.sheets)) {
        sheets[sheetName] = {
          totalWeight: sheet.totalWeight,
          balanceColors: sheet.balanceColors ?? false,
          foil: sheet.foil ?? false,
          fixed: sheet.fixed ?? false,
          cards: sheet.cards.map((card) => ({
            uuid: card.uuid,
            weight: card.weight,
          })),
        };
      }
    }

    // Create the booster configuration
    product.booster = {
      boosters,
      boostersTotalWeight,
      name: extendedProduct.name,
      sheets,
    };

    logger.debug(
      {
        productUuid: extendedProduct.uuid,
        boosterConfig: {
          boostersCount: boosters.length,
          totalWeight: boostersTotalWeight,
          sheetsCount: Object.keys(sheets).length,
        },
      },
      'Converted booster configuration'
    );
  } else {
    logger.warn(
      {
        productUuid: extendedProduct.uuid,
        productName: extendedProduct.name,
        product: product,
      },
      'Product has no booster configuration'
    );
  }

  return product;
}

function createPurchaseUrls(
  purchaseUrls?: Partial<PurchaseUrls>
): PurchaseUrls {
  return {
    cardKingdom: purchaseUrls?.cardKingdom ?? '',
    cardKingdomFoil: purchaseUrls?.cardKingdomFoil ?? '',
    cardKingdomEtched: purchaseUrls?.cardKingdomEtched ?? '',
    cardmarket: purchaseUrls?.cardmarket ?? '',
    tcgplayer: purchaseUrls?.tcgplayer ?? '',
    tcgplayerEtched: purchaseUrls?.tcgplayerEtched ?? '',
  };
}

async function processSealedProducts(
  allPrintingsFile: AllPrintingsFile,
  tcgProducts: TcgCsvProduct[]
): Promise<Record<string, UnifiedSealedProduct>> {
  logger.info(
    'Processing sealed products from AllPrintingsFile to build master map...'
  );
  const masterSealedProductsMap: Record<string, UnifiedSealedProduct> = {};
  const tcgProductMap = new Map(tcgProducts.map((p) => [p.productId, p]));

  for (const [setCode, mtgSet] of Object.entries(allPrintingsFile.data)) {
    if (
      !mtgSet.sealedProduct ||
      !Array.isArray(mtgSet.sealedProduct) ||
      mtgSet.sealedProduct.length === 0
    )
      continue;

    for (const productStub of mtgSet.sealedProduct) {
      const tcgProductIdStr = productStub.identifiers?.tcgplayerProductId;
      const tcgProduct = tcgProductIdStr
        ? tcgProductMap.get(parseInt(tcgProductIdStr))
        : undefined;

      const derivedProductCode = `${mtgSet.code}_${productStub.uuid}`;

      logger.debug(
        {
          setCode,
          productUuid: productStub.uuid,
          productName: productStub.name,
          derivedCode: derivedProductCode,
          hasTcgProduct: !!tcgProduct,
        },
        'Processing sealed product from MTGJSON'
      );

      const unifiedSp: UnifiedSealedProduct = {
        uuid: productStub.uuid,
        code: derivedProductCode,
        name: productStub.name,
        setCode: setCode,
        category: productStub.category,
        subtype: productStub.subtype || undefined,
        cardCount: productStub.cardCount,
        productSize: productStub.productSize,
        releaseDate: productStub.releaseDate,
        contents: productStub.contents
          ? convertMtgjsonContentsToUnified(productStub.contents)
          : undefined,
        identifiers: convertMtgjsonIdentifiersToUnified(
          productStub.identifiers
        ),
        purchaseUrls: convertMtgjsonPurchaseUrlsToUnified(
          productStub.purchaseUrls
        ),
        booster: undefined,
        tcgplayer: {
          product_id: tcgProduct?.productId || 0,
          prices: {
            normal: convertPriceToUnifiedPriceInfo(
              tcgProduct?.normalPrice ??
                tcgProduct?.marketPrice ??
                tcgProduct?.avgPrice ??
                null
            ),
            foil: convertPriceToUnifiedPriceInfo(
              tcgProduct?.foilPrice ??
                tcgProduct?.marketPrice ??
                tcgProduct?.avgPrice ??
                null
            ),
          },
          image_url: tcgProduct?.imageUrl || '',
          clean_name: tcgProduct?.cleanName || '',
          extended_data: [],
          market_price:
            safeConvertMarketPrice(tcgProduct?.marketPrice ?? null) ??
            undefined,
        },
      };
      masterSealedProductsMap[productStub.uuid] = unifiedSp;
    }
  }
  logger.info(
    `Created master map with ${Object.keys(masterSealedProductsMap).length} sealed products from AllPrintingsFile.`
  );
  return masterSealedProductsMap;
}

function processTcgProduct(product: TcgCsvProduct): TCGPlayerData {
  return {
    product_id: product.productId,
    prices: {
      normal: {
        lowPrice: product.normalPrice ?? 0,
        midPrice: product.avgPrice ?? 0,
        highPrice: 0,
        marketPrice: safeConvertMarketPrice(product.marketPrice) ?? 0,
        directLowPrice: product.directLowPrice ?? 0,
      },
      foil: {
        lowPrice: product.foilPrice ?? 0,
        midPrice: product.avgPrice ?? 0,
        highPrice: 0,
        marketPrice: safeConvertMarketPrice(product.marketPrice) ?? 0,
        directLowPrice: product.directLowPrice ?? 0,
      },
    },
    image_url: product.imageUrl,
    clean_name: product.cleanName,
    extended_data: [],
    market_price: safeConvertMarketPrice(product.marketPrice) ?? undefined,
  };
}

// -------------- MAIN EXPORTED FUNCTION --------------
export async function loadAllData(): Promise<LoadedData> {
  logger.info('--- Starting Data Loading Process ---');

  await ensureDirectoryExists(ALL_PRINTINGS_PATH);

  // 1. Load AllPrintingsFile (raw MTGJSON)
  await ensureAllPrintingsUnzipped(ALL_PRINTINGS_PATH);
  const allPrintingsFile = loadAllPrintings(ALL_PRINTINGS_PATH);
  if (!allPrintingsFile) {
    logger.fatal('Failed to load AllPrintings.json. Server cannot start.');
    throw new Error('Failed to load AllPrintings.json.');
  }

  // 2. Load ExtendedSealedDataFile
  const extendedDataExists = await ensureFileExistsHelper(
    EXTENDED_DATA_PATH,
    EXTENDED_DATA_URL,
    false
  );
  if (!extendedDataExists) {
    logger.fatal(
      'Failed to load sealed_extended_data.json. Server cannot start.'
    );
    throw new Error('Failed to load sealed_extended_data.json.');
  }
  let extendedDataArray = loadAndProcessExtendedData(EXTENDED_DATA_PATH);

  // 2.5 Merge additional _products.json files into extendedDataArray
  const dataDir = path.join(process.cwd(), DATA_DIR);
  try {
    const filesInDatadir = fs.readdirSync(dataDir);
    const additionalProductFiles = filesInDatadir.filter(
      (file) =>
        file.endsWith('_products.json') &&
        file !== path.basename(EXTENDED_DATA_PATH)
    );
    for (const productFile of additionalProductFiles) {
      const filePath = path.join(dataDir, productFile);
      extendedDataArray = loadAndMergeAdditionalProducts(
        extendedDataArray,
        filePath
      );
    }
  } catch (readdirError) {
    logger.error(
      { err: readdirError, directory: dataDir },
      'Error reading data directory for additional product files.'
    );
  }

  // 3. Fetch all TCGPlayer Product data (once)
  const tcgGroupsResult = await TcgCsvService.fetchGroups();
  if (!isOk(tcgGroupsResult)) {
    logger.error(
      'Failed to fetch TCGPlayer groups. Price data will be incomplete.'
    );
    throw new Error('Failed to fetch TCGPlayer groups for initial load.');
  }
  const tcgGroups = tcgGroupsResult.value;
  const tcgGroupMap = new Map(tcgGroups.map((g) => [g.groupId, g]));
  const allTcgProducts: TcgCsvProduct[] = [];
  for (const mtgJsonSet of Object.values(allPrintingsFile.data)) {
    const tcgGroupId = mtgJsonSet.tcgplayerGroupId;
    if (tcgGroupId && tcgGroupMap.has(tcgGroupId)) {
      const productsResult = await TcgCsvService.fetchProducts(tcgGroupId);
      if (isOk(productsResult)) {
        allTcgProducts.push(...productsResult.value);
      } else {
        logger.warn(
          { setCode: mtgJsonSet.code, tcgGroupId },
          `Failed to fetch TCGPlayer products for group ${tcgGroupId}`
        );
      }
    }
  }
  logger.info(
    `Fetched a total of ${allTcgProducts.length} TCGPlayer products across all groups.`
  );

  // 4. Create Master Map of Sealed Products (from AllPrintingsFile + TCGPlayer data)
  let masterSealedProductsMap = await processSealedProducts(
    allPrintingsFile,
    allTcgProducts
  );

  // 4.5 Enrich/Merge with ExtendedSealedData
  const finalMasterSealedProductsMap: Record<string, UnifiedSealedProduct> = {
    ...masterSealedProductsMap,
  };

  // Build code to UUID mapping
  const codeToUuidMap: Record<string, string> = {};
  for (const [uuid, product] of Object.entries(masterSealedProductsMap)) {
    codeToUuidMap[product.code] = uuid;
  }

  for (const extProduct of extendedDataArray) {
    const convertedExtProduct = convertSealedProductFromExtended(extProduct);
    if (!convertedExtProduct) {
      logger.warn(
        { productName: extProduct.name, uuid: extProduct.uuid },
        'Failed to convert extended product'
      );
      continue;
    }

    logger.trace(
      {
        extUuid: convertedExtProduct.uuid,
        extCode: convertedExtProduct.code,
        extName: convertedExtProduct.name,
        hasBooster: !!convertedExtProduct.booster,
      },
      'Processing extended sealed product'
    );

    const definitiveUuid = convertedExtProduct.uuid;
    let targetProduct = finalMasterSealedProductsMap[definitiveUuid];

    // If not found by UUID, try to find by code
    if (!targetProduct) {
      const existingUuid = codeToUuidMap[convertedExtProduct.code];
      if (existingUuid) {
        logger.warn(
          {
            extUuid: convertedExtProduct.uuid,
            extCode: convertedExtProduct.code,
            existingUuid,
            existingCode: finalMasterSealedProductsMap[existingUuid].code,
          },
          'Found product by code instead of UUID'
        );
        targetProduct = finalMasterSealedProductsMap[existingUuid];
      }
    }

    if (targetProduct) {
      // Update booster configuration if it exists and is valid
      if (convertedExtProduct.booster) {
        if (
          !convertedExtProduct.booster.boosters ||
          convertedExtProduct.booster.boosters.length === 0
        ) {
          logger.warn(
            {
              uuid: convertedExtProduct.uuid,
              code: convertedExtProduct.code,
            },
            'Extended product has empty booster configuration'
          );
        } else {
          // Validate booster configuration
          const hasValidContents = convertedExtProduct.booster.boosters.every(
            (booster) => booster.contents && booster.contents.length > 0
          );

          if (!hasValidContents) {
            logger.warn(
              {
                uuid: convertedExtProduct.uuid,
                code: convertedExtProduct.code,
              },
              'Extended product has invalid booster contents'
            );
          } else {
            targetProduct.booster = convertedExtProduct.booster;
          }
        }
      }

      // Update other fields
      targetProduct.name = convertedExtProduct.name;
      targetProduct.code = convertedExtProduct.code;

      // Update TCGPlayer data if available
      if (convertedExtProduct.tcgplayer.market_price !== undefined) {
        targetProduct.tcgplayer.market_price =
          convertedExtProduct.tcgplayer.market_price;
        targetProduct.tcgplayer.prices = convertedExtProduct.tcgplayer.prices;
      }
    } else {
      // Add new product
      logger.info(
        {
          uuid: convertedExtProduct.uuid,
          code: convertedExtProduct.code,
          name: convertedExtProduct.name,
        },
        'Adding new sealed product from extended data'
      );
      finalMasterSealedProductsMap[definitiveUuid] = convertedExtProduct;
      codeToUuidMap[convertedExtProduct.code] = definitiveUuid;
    }
  }

  masterSealedProductsMap = finalMasterSealedProductsMap;
  logger.info(
    `Master sealed products map size after merging extended data: ${Object.keys(masterSealedProductsMap).length}`
  );

  // 5. Create UnifiedData (Sets and Cards), populating Set.sealedProduct using the master map
  const unifiedData = convertToUnifiedData(
    allPrintingsFile,
    masterSealedProductsMap
  );
  if (!unifiedData) {
    logger.fatal('Unified data could not be created.');
    throw new Error('Unified data creation failed.');
  }

  // Extract sets from unifiedData
  const sets = Object.values(unifiedData.data);

  // 6. Load Scryfall data
  await ensureScryfallAllCards(SCRYFALL_DATA_PATH);

  const neededScryfallIds = new Set<string>();
  for (const set of Object.values(allPrintingsFile.data)) {
    for (const card of set.cards) {
      if (card.identifiers?.scryfallId) {
        neededScryfallIds.add(card.identifiers.scryfallId);
      }
    }
  }
  logger.info(
    `Identified ${neededScryfallIds.size} unique Scryfall IDs needed from AllPrintings data.`
  );

  const allScryfallCardsMap = await loadScryfallAllCardsStreamed(
    SCRYFALL_DATA_PATH,
    neededScryfallIds
  );

  // 7. Build CombinedCards map
  const combinedCardsMap = await buildCombinedCards(
    allPrintingsFile,
    allScryfallCardsMap
  );

  // 8. Apply TCGPlayer prices to combinedCardsMap and update extendedDataArray market prices
  await fetchAndApplyTcgPrices(
    combinedCardsMap,
    extendedDataArray,
    allTcgProducts
  );

  // 9. Final array of sets for GraphQL
  const setsArray: UnifiedSet[] = Object.entries(unifiedData.data).map(
    ([code, set]) => ({
      ...set,
      code,
      cards: set.cards || [],
      tokens: set.tokens || [],
      sealedProduct: set.sealedProduct || [],
    })
  );

  // -------------- HELPER FUNCTION: BOOSTER CONFIGURATION CONVERSION --------------
  function convertBoosterConfig(rawConfig: any): BoosterConfig {
    if (!rawConfig.boosters || !Array.isArray(rawConfig.boosters)) {
      throw new Error(
        'Invalid booster configuration: missing or invalid boosters array'
      );
    }

    // Convert boosters array
    const boosters = rawConfig.boosters.map((booster: any) => {
      if (!booster.contents || typeof booster.contents !== 'object') {
        throw new Error(
          'Invalid booster configuration: missing or invalid contents'
        );
      }

      // Convert contents from object to array format
      const contents = Object.entries(booster.contents).map(
        ([sheet, count]) => ({
          sheet,
          count: Number(count),
        })
      );

      return {
        weight: Number(booster.weight),
        contents,
      };
    });

    // Convert sheets
    const sheets: Record<string, BoosterSheet> = {};
    if (rawConfig.sheets) {
      for (const [sheetName, sheetData] of Object.entries(rawConfig.sheets)) {
        const sheet = sheetData as any;
        if (sheet.cards && typeof sheet.cards === 'object') {
          // Convert cards from object format to array format
          const cards = Object.entries(sheet.cards).map(([uuid, weight]) => ({
            uuid,
            weight: Number(weight),
          }));

          sheets[sheetName] = {
            totalWeight: Number(sheet.totalWeight),
            balanceColors: Boolean(sheet.balanceColors),
            foil: Boolean(sheet.foil),
            fixed: Boolean(sheet.fixed),
            cards,
          };
        }
      }
    }

    return {
      boosters,
      boostersTotalWeight: Number(rawConfig.boostersTotalWeight),
      name: String(rawConfig.name),
      sheets,
    };
  }

  // Load booster configurations
  logger.info('Loading booster configurations...');
  const boosterConfigs: Record<string, any> = {};
  try {
    const boosterFiles = fs.readdirSync(BOOSTERS_DIR);
    for (const file of boosterFiles) {
      if (file.endsWith('.json')) {
        const setCode = file.replace('.json', '');
        const rawConfig = JSON.parse(
          fs.readFileSync(path.join(BOOSTERS_DIR, file), 'utf8')
        );
        boosterConfigs[setCode] = rawConfig;
      }
    }
    logger.info(
      `Loaded ${Object.keys(boosterConfigs).length} booster configurations`
    );
  } catch (error) {
    logger.error('Failed to load booster configurations:', error);
  }

  // Merge booster configurations with set data and sealed products
  for (const [setCode, setData] of Object.entries(allPrintingsFile.data)) {
    if (boosterConfigs[setCode]) {
      // Merge with set data
      setData.booster = boosterConfigs[setCode].booster;
      logger.trace(`Merged booster configuration for set ${setCode}`);

      // Find and update corresponding sealed products
      for (const product of Object.values(masterSealedProductsMap)) {
        // Check if the product belongs to this set by comparing set code and name
        // Look for products that contain the set name or set code in their name
        const setCodeInName = product.name
          .toLowerCase()
          .includes(setCode.toLowerCase());
        const setDataNameInName = product.name
          .toLowerCase()
          .includes(setData.name.toLowerCase());

        // Additional matching logic: check if the product's setCode matches
        const productSetCodeMatch = product.setCode === setCode;

        if (setCodeInName || setDataNameInName || productSetCodeMatch) {
          // Look for a booster configuration that matches this product's UUID
          const productUuid = product.uuid;
          const boosterConfig = boosterConfigs[setCode].booster[productUuid];

          if (boosterConfig) {
            // Convert the booster configuration to the expected format
            const convertedBooster = convertBoosterConfig(boosterConfig);
            product.booster = convertedBooster;
            logger.trace(
              `Merged booster configuration for product ${product.uuid} (${product.name}) with set ${setCode}`
            );
          } else {
            logger.trace(
              `Product ${product.uuid} (${product.name}) matches set ${setCode} but no booster configuration found for UUID ${productUuid}. Available UUIDs: ${Object.keys(boosterConfigs[setCode].booster).join(', ')}`
            );
          }
        }
      }
    }
  }

  logger.info('--- Data Loading Process Finished Successfully ---');
  return {
    allPrintings: unifiedData,
    extendedDataArray,
    combinedCards: combinedCardsMap,
    sealedProducts: masterSealedProductsMap,
    codeToUuidMap,
    sets,
  };
}
