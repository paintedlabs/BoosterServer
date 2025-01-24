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

// ----------------------- LOAD FILES -----------------------
function loadAllPrintings(filePath: string): AllPrintings | null {
  const absPath = path.resolve(filePath);
  try {
    const data = fs.readFileSync(absPath, 'utf-8');
    return JSON.parse(data) as AllPrintings;
  } catch (err) {
    console.error(`Failed to load AllPrintings from ${filePath}`, err);
    return null;
  }
}

function loadExtendedData(filePath: string): ExtendedSealedData[] {
  const absPath = path.resolve(filePath);
  try {
    const data = fs.readFileSync(absPath, 'utf-8');
    return JSON.parse(data) as ExtendedSealedData[];
  } catch (err) {
    console.error(`Failed to load extended data from ${filePath}`, err);
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

// ---------- Server Startup ----------
function main() {
  const allPrintingsPath = process.argv[2] || 'AllPrintings.json';
  const extendedDataPath = process.argv[3] || 'sealed_extended_data.json';

  console.log(`Loading AllPrintings from: ${allPrintingsPath}`);
  allPrintings = loadAllPrintings(allPrintingsPath);
  if (!allPrintings) {
    console.error('Failed to load AllPrintings.json, exiting.');
    process.exit(1);
  }

  console.log(`Loading extended data from: ${extendedDataPath}`);
  extendedDataArray = loadExtendedData(extendedDataPath);
  console.log(`Loaded ${extendedDataArray.length} products from extended data.`);

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main();