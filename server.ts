/**
 * server.ts
 *
 * A Node.js + Express server that:
 *   1) Loads AllPrintings.json
 *   2) Loads sealed_extended_data.json (array of sealed products)
 *   3) Exposes these endpoints:
 *      GET /sets
 *      GET /sets/:setCode/products
 *      POST /products/:productCode/open
 */

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';


// If on Node < 18, import node-fetch:

// ... your other imports & interfaces ...

// We'll define some URLs to fetch the files from if they're missing.
// Replace these with your actual URLs:
const ALL_PRINTINGS_URL = 'https://mtgjson.com/api/v5/AllPrintings.json';
const ALL_PRINTINGS_URL_ZIPPED = 'https://mtgjson.com/api/v5/AllPrintings.json.zip';
const EXTENDED_DATA_URL = 'https://raw.githubusercontent.com/taw/magic-sealed-data/refs/heads/master/sealed_extended_data.json';

// Minimal "Card" structure for final pack
class Card {
  constructor(public name: string, public rarity: string) { }
}

const app = express(); // <-- Create app directly
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());

// -- Data Structures --
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
  // ... Additional fields omitted ...
}

interface CardSet {
  uuid: string;
  name: string;
  rarity: string;
  // ... Additional fields omitted ...
}

interface ExtendedSealedData {
  name: string;    // "Foundations Collector Booster"
  code: string;    // "fdn-collector"
  set_code: string; // "FDN"
  set_name: string; // "Foundations"
  boosters: ExtendedBooster[];
  sheets: Record<string, ExtendedSheet>;
  source_set_codes: string[]; // e.g. ["FDN", "SPG"]
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

// Globals loaded at startup
let allPrintings: AllPrintings | null = null;
let extendedDataArray: ExtendedSealedData[] = [];

// You could build a global cardDatabase if you want...
const cardDatabase: Record<string, CardSet> = {};

// ------------------------------------
// Check local files or fetch if missing
// ------------------------------------
async function ensureFileExists(localPath: string, remoteUrl: string): Promise<void> {
  if (fs.existsSync(localPath)) {
    console.log(`Found local file: ${localPath}, skipping fetch.`);
    return;
  }
  console.log(`File not found locally: ${localPath}\nFetching from: ${remoteUrl} ...`);

  // Use fetch to get the file contents
  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch '${remoteUrl}' - ${response.status} ${response.statusText}`);
  }
  const textData = await response.text();

  // Write the file locally
  fs.writeFileSync(localPath, textData, 'utf-8');
  console.log(`Saved file to: ${localPath}`);
}

// 2) Load the JSON after confirming it exists
function loadAllPrintings(filePath: string): AllPrintings | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as AllPrintings;
  } catch (err) {
    console.error('Failed to load AllPrintings:', err);
    return null;
  }
}

function loadExtendedData(filePath: string): ExtendedSealedData[] {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as ExtendedSealedData[];
  } catch (err) {
    console.error('Failed to load extended data:', err);
    return [];
  }
}
// Weighted random pick from an array of boosters
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

// Weighted random pick of a single card from a sheet
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

// 1) GET /sets
// Return an array of distinct set codes from extended data
app.get('/sets', (req: Request, res: Response) => {
  const uniqueSetCodes = new Set<string>();
  extendedDataArray.forEach((prod) => {
    // e.g. "FDN"
    uniqueSetCodes.add(prod.set_code.toUpperCase());
  });

  const result = Array.from(uniqueSetCodes);
  return res.json(result);
});

// 2) GET /sets/:setCode/products
// Return an array of all sealed products from extendedDataArray that match that set code
app.get('/sets/:setCode/products', (req: Request, res: Response) => {
  const setCodeParam = req.params.setCode.toUpperCase();
  const matching = extendedDataArray.filter(
    (prod) => prod.set_code.toUpperCase() === setCodeParam
  );
  return res.json(matching);
});

// 3) POST /products/:productCode/open
// Generate a booster pack for the given product code
app.post('/products/:productCode/open', (req: Request, res: Response) => {
  const productCode = req.params.productCode.toLowerCase();
  const product = extendedDataArray.find(
    (p) => p.code.toLowerCase() === productCode
  );
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Build a local map of cards from the sets in source_set_codes
  const localMap: Record<string, CardSet> = {};
  for (let setCode of product.source_set_codes) {
    setCode = setCode.toUpperCase();
    const setObj = allPrintings?.data[setCode];
    if (!setObj) {
      console.warn(`Set code '${setCode}' not found in AllPrintings`);
      continue;
    }
    setObj.cards.forEach((c) => {
      localMap[c.uuid] = c;
    });
  }

  // Pick which booster
  const chosenBooster = pickBooster(product.boosters);
  if (!chosenBooster) {
    return res.json({ pack: [], warning: 'No booster found or zero weight' });
  }

  // Fill the pack
  const pack: Card[] = [];
  for (const [sheetName, count] of Object.entries(chosenBooster.sheets)) {
    const sheetData = product.sheets[sheetName];
    if (!sheetData) {
      console.log(`No sheet data for sheet '${sheetName}' in product '${product.code}'`);
      continue;
    }
    for (let i = 0; i < count; i++) {
      const pickedUUID = pickCardFromSheet(sheetData);
      if (!pickedUUID) continue;

      const cardDef = localMap[pickedUUID];
      if (cardDef) {
        pack.push(new Card(cardDef.name, cardDef.rarity));
      } else {
        console.warn('Could not find card in local map for UUID:', pickedUUID);
      }
    }
  }

  // Return the resulting pack
  return res.json({ pack });
});

// Example usage:
// await ensureAllPrintingsUnzipped('AllPrintings.json', 'https://example.com/AllPrintings.zip', 'AllPrintings.json');
// if the user doesn't have AllPrintings.json locally, we download the .zip, extract AllPrintings.json, and write it.

export async function ensureAllPrintingsUnzipped(localJsonPath: string): Promise<void> {
  if (fs.existsSync(localJsonPath)) {
    console.log(`Found local file: ${localJsonPath}, no need to download zip.`);
    return;
  }

  console.log(`File not found locally: ${localJsonPath}\nFetching zip from: ${ALL_PRINTINGS_URL_ZIPPED} ...`);
  const response = await fetch(ALL_PRINTINGS_URL_ZIPPED);
  if (!response.ok) {
    throw new Error(`Failed to fetch '${ALL_PRINTINGS_URL_ZIPPED}': ${response.status} ${response.statusText}`);
  }

  // Use arrayBuffer(), then convert to a Node.js Buffer.
  const arrayBuf = await response.arrayBuffer();
  const zipBuffer = Buffer.from(arrayBuf);

  // Open the zip from the buffer using unzipper
  const directory = await unzipper.Open.buffer(zipBuffer);

  // 3) Find the entry matching zippedJsonFilename (e.g. 'AllPrintings.json')
  const zipEntry = directory.files.find(f => f.path === 'AllPrintings.json');
  if (!zipEntry) {
    throw new Error(`Could not find AllPrintings.json inside the downloaded ZIP.`);
  }

  // 4) Extract that file entry into a buffer
  const unzippedData = await zipEntry.buffer();

  // 5) Write that unzipped JSON to localJsonPath
  fs.writeFileSync(localJsonPath, unzippedData);
  console.log(`Successfully saved unzipped file to ${localJsonPath}`);
}

// ------------------------------------
// Main startup: check local files or fetch, then load data
// ------------------------------------
async function main() {
  const allPrintingsPath = process.argv[2] || 'data/AllPrintings.json';
  const extendedDataPath = process.argv[3] || 'data/sealed_extended_data.json';

  // 1) Ensure local files exist (fetch if missing)
  await ensureAllPrintingsUnzipped(allPrintingsPath);
  await ensureFileExists(allPrintingsPath, ALL_PRINTINGS_URL);
  await ensureFileExists(extendedDataPath, EXTENDED_DATA_URL);

  // 2) Load data from local disk
  allPrintings = loadAllPrintings(allPrintingsPath);
  if (!allPrintings) {
    console.error('AllPrintings data is unavailable, exiting.');
    process.exit(1);
  }
  extendedDataArray = loadExtendedData(extendedDataPath);
  console.log(`Loaded ${extendedDataArray.length} products.`);

  // 3) Start the server
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// We must call main as an async function:
main().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});