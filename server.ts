/**
 * server.ts
 *
 * A Node.js + Express server that:
 *   1) Ensures AllPrintings.json (zipped) is available locally, unzips if needed
 *   2) Ensures sealed_extended_data.json is available locally
 *   3) Ensures the Scryfall "all_cards" file is downloaded
 *   4) Uses stream-json to parse only the needed Scryfall cards
 *   5) Merges AllPrintings + Scryfall
 *   6) Exposes:
 *       GET /sets
 *       GET /sets/:setCode/products
 *       POST /products/:productCode/open
 *
 *   The /open endpoint returns merged data for each card.
 */

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';

// If on Node < 18, install node-fetch:
import fetch, { Response as FetchResponse } from 'node-fetch';

// For streaming parse:
import { pipeline } from 'stream/promises';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import cors from 'cors';

// -------------- CONFIG CONSTANTS --------------
const PORT = process.env.PORT || 8080;

// URLs to fetch if local files are missing
const ALL_PRINTINGS_URL = 'https://mtgjson.com/api/v5/AllPrintings.json';
const ALL_PRINTINGS_URL_ZIPPED = 'https://mtgjson.com/api/v5/AllPrintings.json.zip';
const EXTENDED_DATA_URL = 'https://raw.githubusercontent.com/taw/magic-sealed-data/refs/heads/master/sealed_extended_data.json';
const SCRYFALL_ALL_CARDS_URL = 'https://data.scryfall.io/all-cards/all-cards-20250124102227.json';

// Local file paths (adjust as desired)
const ALL_PRINTINGS_PATH = 'data/AllPrintings.json';
const EXTENDED_DATA_PATH = 'data/sealed_extended_data.json';
const SCRYFALL_DATA_PATH = 'data/scryfall_all_cards.json';

// -------------- EXPRESS APP --------------
const app = express();

// -------------- CORS CONFIGURATION --------------
// Define your frontend's origin
const FRONTEND_ORIGIN = 'https://paintedlabs.github.io';

// Apply CORS middleware before other middleware and routes
app.use(cors({
  origin: FRONTEND_ORIGIN, // Allow only this origin
  methods: ['GET', 'POST'], // Allow only GET and POST methods
}));

// -------------- MIDDLEWARE --------------
app.use(bodyParser.json());

// -------------- INTERFACES --------------
interface AllPrintings {
  meta: Meta;
  data: Record<string, MTGSet>;
}
interface Meta {
  version: string;
  date: string;
}

interface MTGSet {
  baseSetSize: number;
  code: string;
  name: string;
  releaseDate: string;
  cards: CardSet[];
}

interface CardSet {
  uuid: string;
  name: string;
  rarity: string;
  identifiers?: {
    scryfallId?: string;
    [key: string]: any;
  };
}

interface ExtendedSealedData {
  name: string;
  code: string;
  set_code: string;
  set_name: string;
  boosters: ExtendedBooster[];
  sheets: Record<string, ExtendedSheet>;
  source_set_codes: string[];
}

interface ExtendedBooster {
  sheets: Record<string, number>;
  weight: number;
}

interface ExtendedSheet {
  total_weight: number;
  cards: ExtendedSheetCard[];
}

interface ExtendedSheetCard {
  set: string;
  number: string;
  weight: number;
  foil?: boolean;
  uuid: string;
}

// Scryfall data shape (simplified)
interface ScryfallCard {
  id: string; // scryfallId
  name: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
    art_crop?: string;
    border_crop?: string;
    [key: string]: any;
  };
  mana_cost?: string;
  oracle_text?: string;
  prices?: {
    usd?: string;
    usd_foil?: string;
    [key: string]: string | undefined;
  };
  // many more fields...
}

interface CombinedCard {
  allPrintingsData: CardSet;
  scryfallData?: ScryfallCard;
}

// -------------- GLOBALS --------------
let allPrintings: AllPrintings | null = null;
let extendedDataArray: ExtendedSealedData[] = [];
const combinedCards: Record<string, CombinedCard> = {};

// -------------- STARTUP: FILE ENSURE & LOAD --------------
async function ensureAllPrintingsUnzipped(localJsonPath: string): Promise<void> {
  if (fs.existsSync(localJsonPath)) {
    console.log(`Found local file: ${localJsonPath}, no need to download zip.`);
    return;
  }

  console.log(`File not found locally: ${localJsonPath}`);
  console.log(`Fetching zip from: ${ALL_PRINTINGS_URL_ZIPPED} ...`);
  const response = await fetch(ALL_PRINTINGS_URL_ZIPPED);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch '${ALL_PRINTINGS_URL_ZIPPED}': ${response.status} ${response.statusText}`
    );
  }

  const arrayBuf = await response.arrayBuffer();
  const zipBuffer = Buffer.from(arrayBuf);

  const directory = await unzipper.Open.buffer(zipBuffer);
  const zipEntry = directory.files.find((f) => f.path === 'AllPrintings.json');
  if (!zipEntry) {
    throw new Error(`Could not find AllPrintings.json in the ZIP.`);
  }
  const unzippedData = await zipEntry.buffer();

  fs.writeFileSync(localJsonPath, unzippedData);
  console.log(`Saved unzipped file to: ${localJsonPath}`);
}

async function ensureFileExists(localPath: string, remoteUrl: string): Promise<void> {
  if (fs.existsSync(localPath)) {
    console.log(`Found local file: ${localPath}, skipping fetch.`);
    return;
  }
  console.log(`File not found: ${localPath}`);
  console.log(`Fetching from: ${remoteUrl} ...`);
  const resp = await fetch(remoteUrl);
  if (!resp.ok) {
    throw new Error(`Failed to fetch '${remoteUrl}': ${resp.status} ${resp.statusText}`);
  }
  const textData = await resp.text();
  fs.writeFileSync(localPath, textData, 'utf-8');
  console.log(`Saved file to: ${localPath}`);
}

// Stream the Scryfall all-cards download to avoid large memory usage
async function ensureScryfallAllCards(localPath: string, remoteUrl: string): Promise<void> {
  if (fs.existsSync(localPath)) {
    console.log(`Scryfall all-cards file found locally: ${localPath}`);
    return;
  }
  console.log(`Not found locally: ${localPath}`);
  console.log(`Downloading from: ${remoteUrl}`);

  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error(`Scryfall bulk data fetch failed: ${response.status} ${response.statusText}`);
  }

  const fileStream = fs.createWriteStream(localPath);
  await pipeline(response.body as any, fileStream);

  console.log(`Wrote Scryfall data to ${localPath}`);
}

// -------------- LOAD INTO MEMORY --------------
function loadAllPrintings(filePath: string): AllPrintings | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as AllPrintings;
  } catch (err) {
    console.error(`Failed to load AllPrintings from ${filePath}`, err);
    return null;
  }
}

function loadExtendedData(filePath: string): ExtendedSealedData[] {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as ExtendedSealedData[];
  } catch (err) {
    console.error(`Failed to load extended data from ${filePath}`, err);
    return [];
  }
}

/**
 * Parse the giant Scryfall file in a streaming way to build a map
 * of only the cards we actually need (based on scryfallIds from AllPrintings).
 */
async function loadScryfallAllCardsStreamed(
  filePath: string,
  neededIds: Set<string>
): Promise<Record<string, ScryfallCard>> {
  console.log(`Streaming parse of Scryfall from ${filePath}. Looking for ${neededIds.size} IDs.`);

  const scryfallMap: Record<string, ScryfallCard> = {};

  const pipelineStream = chain([
    fs.createReadStream(filePath),
    parser(),
    streamArray(), // handles each element in the top-level JSON array
  ]);

  // Each "data" event is { key, value } where value is one ScryfallCard
  for await (const chunk of pipelineStream) {
    const card = chunk.value as ScryfallCard;
    if (card.id && neededIds.has(card.id)) {
      scryfallMap[card.id] = card;
    }
  }

  console.log(
    `Found ${Object.keys(scryfallMap).length} matching Scryfall cards out of needed ${neededIds.size}.`
  );
  return scryfallMap;
}

// -------------- MERGING --------------
/**
 * 1) Build a set of scryfallIds needed by AllPrintings
 * 2) Load only those from the huge Scryfall file
 * 3) Build combinedCards
 */
async function buildCombinedCards(): Promise<void> {
  if (!allPrintings) return;

  // Gather needed scryfall IDs
  const neededIds = new Set<string>();
  for (const setCode of Object.keys(allPrintings.data)) {
    const setObj = allPrintings.data[setCode];
    for (const card of setObj.cards) {
      const scryId = card.identifiers?.scryfallId;
      if (scryId) {
        neededIds.add(scryId);
      }
    }
  }
  console.log(`We need Scryfall data for ${neededIds.size} cards.`);

  // Stream-parse the Scryfall file, building a minimal map
  const scryfallMap = await loadScryfallAllCardsStreamed(SCRYFALL_DATA_PATH, neededIds);

  // Build the combinedCards map
  let count = 0;
  for (const setCode of Object.keys(allPrintings.data)) {
    const setObj = allPrintings.data[setCode];
    for (const card of setObj.cards) {
      const scryId = card.identifiers?.scryfallId;
      const scryData = scryId ? scryfallMap[scryId] : undefined;
      combinedCards[card.uuid] = {
        allPrintingsData: card,
        scryfallData: scryData,
      };
      count++;
    }
  }
  console.log(`Built combined data for ${count} cards.`);
}

// -------------- BOOSTER SIMULATION LOGIC --------------
function pickBooster(boosters: ExtendedBooster[]): ExtendedBooster | null {
  if (!boosters || boosters.length === 0) return null;
  const total = boosters.reduce((acc, b) => acc + b.weight, 0);
  if (total <= 0) return null;

  const rand = Math.floor(Math.random() * total);
  let cumulative = 0;
  for (const booster of boosters) {
    cumulative += booster.weight;
    if (rand < cumulative) {
      return booster;
    }
  }
  return null;
}

function pickCardFromSheet(sheet: ExtendedSheet): string | null {
  if (!sheet.cards || sheet.cards.length === 0 || sheet.total_weight <= 0) return null;
  const rand = Math.floor(Math.random() * sheet.total_weight);
  let cumulative = 0;
  for (const c of sheet.cards) {
    cumulative += c.weight;
    if (rand < cumulative) {
      return c.uuid;
    }
  }
  return null;
}

// -------------- ENDPOINTS --------------
app.get('/sets', (req: Request, res: Response) => {
  // Return unique set codes from extendedDataArray
  console.log('Received GET /sets request');

  const uniqueCodes = new Set<string>();
  for (const product of extendedDataArray) {
    uniqueCodes.add(product.set_code.toUpperCase());
  }
  return res.json(Array.from(uniqueCodes));
});

app.get('/sets/:setCode/products', (req: Request, res: Response) => {
  const setCodeParam = req.params.setCode.toUpperCase();
  const matching = extendedDataArray.filter(
    (p) => p.set_code.toUpperCase() === setCodeParam
  );
  console.log(`Returning products for setCode=${setCodeParam}:`, matching);
  return res.json(matching);
});

app.post('/products/:productCode/open', (req: Request, res: Response) => {
  const productCode = req.params.productCode.toLowerCase();
  const product = extendedDataArray.find(
    (p) => p.code.toLowerCase() === productCode
  );
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Build a local membership map for the relevant sets in product.source_set_codes
  const localMap: Record<string, boolean> = {};
  for (let code of product.source_set_codes) {
    code = code.toUpperCase();
    const setObj = allPrintings?.data[code];
    if (!setObj) {
      console.warn(`Set code '${code}' not found in AllPrintings`);
      continue;
    }
    for (const c of setObj.cards) {
      localMap[c.uuid] = true;
    }
  }

  // Choose a booster from product.boosters
  const chosenBooster = pickBooster(product.boosters);
  if (!chosenBooster) {
    return res.json({ pack: [], warning: 'No booster found or zero weight' });
  }

  // Build the pack
  const pack: Array<{
    sheet: string;
    allPrintingsData: CardSet;
    scryfallData?: ScryfallCard;
  }> = [];

  for (const [sheetName, count] of Object.entries(chosenBooster.sheets)) {
    const sheet = product.sheets[sheetName];
    if (!sheet) {
      console.log(
        `No sheet data for sheet '${sheetName}' in product '${product.code}'`
      );
      continue;
    }

    for (let i = 0; i < count; i++) {
      const pickedUUID = pickCardFromSheet(sheet);
      if (!pickedUUID) continue;

      const combined = combinedCards[pickedUUID];
      if (!combined) {
        console.warn(`No combined data for card uuid=${pickedUUID}`);
        continue;
      }
      if (!localMap[pickedUUID]) {
        console.warn(`Card uuid=${pickedUUID} not in source_set_codes?`);
        continue;
      }

      pack.push({
        sheet: sheetName,
        allPrintingsData: combined.allPrintingsData,
        scryfallData: combined.scryfallData,
      });
    }
  }

  return res.json({ pack });
});

// Example route to serve images via local caching:
function getLocalImagePath(scryfallId: string): string {
  // e.g. cache/images/<scryfallId>.jpg
  const cacheDir = path.join(__dirname, 'cache', 'images');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return path.join(cacheDir, `${scryfallId}.jpg`);
}

app.get('/cards/:scryfallId/image', async (req: Request, res: Response) => {
  try {
    const { scryfallId } = req.params;
    const localPath = getLocalImagePath(scryfallId);

    // If file is cached locally, serve it
    if (fs.existsSync(localPath)) {
      console.log(`Serving cached image for ${scryfallId}`);
      return res.sendFile(localPath);
    }

    console.log(`Image not cached. Fetching from Scryfall for ${scryfallId}...`);
    const cardApiUrl = `https://api.scryfall.com/cards/${scryfallId}`;
    const cardResp = await fetch(cardApiUrl);
    if (!cardResp.ok) {
      return res.status(404).json({ error: 'Card not found on Scryfall' });
    }
    const cardData = await cardResp.json();

    // We'll assume "image_uris.border_crop" exists. Adjust if needed:
    const imageUrl = cardData.image_uris?.border_crop;
    if (!imageUrl) {
      return res.status(400).json({ error: 'No border_crop image available' });
    }

    // Fetch the image itself
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok || !imgResp.body) {
      return res.status(400).json({ error: 'Failed to fetch image' });
    }

    // Stream the image to our cache file, then serve it
    const fileStream = fs.createWriteStream(localPath);
    await pipeline(imgResp.body as any, fileStream);

    return res.sendFile(localPath);
  } catch (err) {
    console.error('Error fetching/saving image:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------- MAIN STARTUP --------------
async function main() {
  try {
    // 1) Ensure local resources
    await ensureAllPrintingsUnzipped(ALL_PRINTINGS_PATH);
    await ensureFileExists(ALL_PRINTINGS_PATH, ALL_PRINTINGS_URL);
    await ensureFileExists(EXTENDED_DATA_PATH, EXTENDED_DATA_URL);
    await ensureScryfallAllCards(SCRYFALL_DATA_PATH, SCRYFALL_ALL_CARDS_URL);

    // 2) Load AllPrintings & sealed_extended_data
    allPrintings = loadAllPrintings(ALL_PRINTINGS_PATH);
    if (!allPrintings) {
      console.error('AllPrintings is null, exiting.');
      process.exit(1);
    }
    extendedDataArray = loadExtendedData(EXTENDED_DATA_PATH);
    console.log(`Loaded ${extendedDataArray.length} sealed products.`);

    // 3) Build the merged data
    await buildCombinedCards();

    // 4) Launch server
    app.listen(PORT, () => {
      console.log(`Server running on http://192.168.1.70:${PORT}`);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});