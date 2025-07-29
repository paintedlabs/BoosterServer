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

import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import * as fs from "fs";
import * as path from "path";
import * as unzipper from "unzipper";
import os from "os";

// If on Node < 18, install node-fetch:
import fetch, { Response as FetchResponse } from "node-fetch";

// For streaming parse:
import { pipeline } from "stream/promises";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { streamArray } from "stream-json/streamers/StreamArray";
import cors from "cors";
import * as ScryfallTypes from "./index";
import sharp from "sharp";

// -------------- CONFIG CONSTANTS --------------
const PORT = process.env.PORT || 8080;

// URLs to fetch if local files are missing
const ALL_PRINTINGS_URL = "https://mtgjson.com/api/v5/AllPrintings.json";
const ALL_PRINTINGS_URL_ZIPPED =
  "https://mtgjson.com/api/v5/AllPrintings.json.zip";
const EXTENDED_DATA_URL =
  "https://raw.githubusercontent.com/taw/magic-sealed-data/refs/heads/master/sealed_extended_data.json";
const SCRYFALL_BULK_DATA_URL = "https://api.scryfall.com/bulk-data";

// Local file paths (adjust as desired)
const ALL_PRINTINGS_PATH = "data/AllPrintings.json";
const EXTENDED_DATA_PATH = "data/sealed_extended_data.json";
const SCRYFALL_DATA_PATH = "data/scryfall_all_cards.json";

// -------------- EXPRESS APP --------------
const app = express();

// -------------- CORS CONFIGURATION --------------
// Define your frontend's origin

// Apply CORS middleware before other middleware and routes
app.use(
  cors({
    origin: "*", // Allow only this origin
    methods: ["GET", "POST"], // Allow only GET and POST methods
  })
);

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

interface SetResponse {
  code: string;
  name: string;
}

interface CombinedCard {
  allPrintingsData: CardSet;
  scryfallData?: ScryfallTypes.IScryfallCard;
}

// -------------- GLOBALS --------------
let allPrintings: AllPrintings | null = null;
let extendedDataArray: ExtendedSealedData[] = [];
const combinedCards: Record<string, CombinedCard> = {}; //MTGJson UUID -> CombinedCard

// -------------- STARTUP: FILE ENSURE & LOAD --------------
async function ensureAllPrintingsUnzipped(
  localJsonPath: string
): Promise<void> {
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
  const zipEntry = directory.files.find((f) => f.path === "AllPrintings.json");
  if (!zipEntry) {
    throw new Error(`Could not find AllPrintings.json in the ZIP.`);
  }
  const unzippedData = await zipEntry.buffer();

  fs.writeFileSync(localJsonPath, unzippedData);
  console.log(`Saved unzipped file to: ${localJsonPath}`);
}

async function ensureFileExists(
  localPath: string,
  remoteUrl: string
): Promise<void> {
  if (fs.existsSync(localPath)) {
    console.log(`Found local file: ${localPath}, skipping fetch.`);
    return;
  }
  console.log(`File not found: ${localPath}`);
  console.log(`Fetching from: ${remoteUrl} ...`);
  const resp = await fetch(remoteUrl);
  if (!resp.ok) {
    throw new Error(
      `Failed to fetch '${remoteUrl}': ${resp.status} ${resp.statusText}`
    );
  }
  const textData = await resp.text();
  fs.writeFileSync(localPath, textData, "utf-8");
  console.log(`Saved file to: ${localPath}`);
}

// Stream the Scryfall all-cards download to avoid large memory usage
async function ensureScryfallAllCards(
  localPath: string,
  bulkDataUrl: string
): Promise<void> {
  if (fs.existsSync(localPath)) {
    console.log(`Scryfall all-cards file found locally: ${localPath}`);
    return;
  }
  console.log(`Not found locally: ${localPath}`);

  // First, fetch the bulk data metadata to get the latest URL
  console.log(`Fetching Scryfall bulk data metadata from: ${bulkDataUrl}`);
  const bulkDataResponse = await fetch(bulkDataUrl);

  if (!bulkDataResponse.ok) {
    throw new Error(
      `Scryfall bulk data metadata fetch failed: ${bulkDataResponse.status} ${bulkDataResponse.statusText}`
    );
  }

  const bulkData = await bulkDataResponse.json();

  // Find the "all_cards" bulk data entry
  const allCardsBulkData = bulkData.data.find(
    (item: any) => item.type === "all_cards"
  );

  if (!allCardsBulkData) {
    throw new Error(
      "Could not find 'all_cards' bulk data in Scryfall API response"
    );
  }

  console.log(
    `Found latest Scryfall all-cards data: ${allCardsBulkData.name} (updated: ${allCardsBulkData.updated_at})`
  );
  console.log(`Downloading from: ${allCardsBulkData.download_uri}`);

  const response = await fetch(allCardsBulkData.download_uri);
  if (!response.ok) {
    throw new Error(
      `Scryfall bulk data fetch failed: ${response.status} ${response.statusText}`
    );
  }

  const fileStream = fs.createWriteStream(localPath);
  await pipeline(response.body as any, fileStream);

  console.log(`Wrote Scryfall data to ${localPath}`);
}

// -------------- LOAD INTO MEMORY --------------
function loadAllPrintings(filePath: string): AllPrintings | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as AllPrintings;
  } catch (err) {
    console.error(`Failed to load AllPrintings from ${filePath}`, err);
    return null;
  }
}

function loadExtendedData(filePath: string): ExtendedSealedData[] {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
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
): Promise<Record<string, ScryfallTypes.IScryfallCard>> {
  console.log(
    `Streaming parse of Scryfall from ${filePath}. Looking for ${neededIds.size} IDs.`
  );

  const scryfallMap: Record<string, ScryfallTypes.IScryfallCard> = {};

  const pipelineStream = chain([
    fs.createReadStream(filePath),
    parser(),
    streamArray(), // handles each element in the top-level JSON array
  ]);

  for await (const chunk of pipelineStream) {
    const card = chunk.value as ScryfallTypes.IScryfallCard;
    if (card.id && neededIds.has(card.id)) {
      scryfallMap[card.id] = card;
    }
  }

  console.log(
    `Found ${
      Object.keys(scryfallMap).length
    } matching Scryfall cards out of needed ${neededIds.size}.`
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

  const scryfallMap = await loadScryfallAllCardsStreamed(
    SCRYFALL_DATA_PATH,
    neededIds
  );

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
  if (!sheet.cards || sheet.cards.length === 0 || sheet.total_weight <= 0)
    return null;
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
app.get("/sets", (req: Request, res: Response) => {
  console.log("Received GET /sets request");

  const seenCodes = new Set<string>();
  const setsArray: Array<{ code: string; name: string }> = [];

  for (const product of extendedDataArray) {
    const setCode = product.set_code.toUpperCase();

    if (!seenCodes.has(setCode) && allPrintings?.data[setCode]) {
      seenCodes.add(setCode);
      setsArray.push({
        code: setCode,
        name: allPrintings.data[setCode].name,
      });
    }
  }

  return res.json(setsArray);
});

app.get("/sets/:setCode/products", (req: Request, res: Response) => {
  const setCodeParam = req.params.setCode.toUpperCase();
  const matching = extendedDataArray.filter(
    (p) => p.set_code.toUpperCase() === setCodeParam
  );
  return res.json(matching);
});

app.post("/products/:productCode/open", (req: Request, res: Response) => {
  const productCode = req.params.productCode.toLowerCase();
  const product = extendedDataArray.find(
    (p) => p.code.toLowerCase() === productCode
  );
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

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

  const chosenBooster = pickBooster(product.boosters);
  if (!chosenBooster) {
    return res.json({ pack: [], warning: "No booster found or zero weight" });
  }

  const pack: Array<{
    sheet: string;
    allPrintingsData: CardSet;
    scryfallData?: ScryfallTypes.IScryfallCard;
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
  console.log(``);
  console.log("Received POST /open request for product:", product.code);
  console.log("Returning pack with", pack.length, "cards:");
  for (const card of pack) {
    console.log(
      `${card.allPrintingsData.name} - ${card.sheet} - ${card.allPrintingsData.uuid}`
    );
  }
  return res.json({ pack });
});

app.post(
  "/products/:productCode/open/:number",
  (req: Request, res: Response) => {
    const productCode = req.params.productCode.toLowerCase();
    const product = extendedDataArray.find(
      (p) => p.code.toLowerCase() === productCode
    );
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

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

    const numPacks = parseInt(req.params.number, 10);
    if (isNaN(numPacks) || numPacks <= 0) {
      return res.status(400).json({ error: "Invalid number of packs" });
    }

    const packs: Array<{
      pack: Array<{
        sheet: string;
        allPrintingsData: CardSet;
        scryfallData?: ScryfallTypes.IScryfallCard;
      }>;
      warning?: string;
    }> = [];

    for (let i = 0; i < numPacks; i++) {
      const chosenBooster = pickBooster(product.boosters);
      if (!chosenBooster) {
        packs.push({ pack: [], warning: "No booster found or zero weight" });
        continue;
      }

      const pack: Array<{
        sheet: string;
        allPrintingsData: CardSet;
        scryfallData?: ScryfallTypes.IScryfallCard;
      }> = [];

      for (const [sheetName, count] of Object.entries(chosenBooster.sheets)) {
        const sheet = product.sheets[sheetName];
        if (!sheet) {
          console.log(
            `No sheet data for sheet '${sheetName}' in product '${product.code}'`
          );
          continue;
        }

        for (let j = 0; j < count; j++) {
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
      packs.push({ pack });
    }

    return res.json({ packs });
  }
);

// Example route to serve images via local caching:
function getLocalImagePath(scryfallId: string): string {
  const cacheDir = path.join(__dirname, "cache", "images");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return path.join(cacheDir, `${scryfallId}.jpg`);
}

app.get(
  "/cards/:allPrintingsId/:cardFace/image",
  async (req: Request, res: Response) => {
    console.log(`\nReceived GET for card image: ${req.params.allPrintingsId}`);
    try {
      const { allPrintingsId, cardFace } = req.params;
      const cardData = combinedCards[allPrintingsId];
      if (!cardData?.scryfallData) {
        return res.status(404).json({ error: "Card not found" });
      }

      const normalizedFace = cardFace.toLowerCase();
      const hasMultipleFaces = cardData.scryfallData.card_faces?.length > 1;
      const effectiveFace =
        normalizedFace === "back" && hasMultipleFaces ? "back" : "front";

      const localPath = path.join(
        __dirname,
        "cache",
        effectiveFace,
        `${allPrintingsId}.jpg`
      );

      const cacheDir = path.dirname(localPath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      if (fs.existsSync(localPath)) {
        console.log(
          `Serving cached ${effectiveFace} image for ${allPrintingsId}`
        );
        return res.sendFile(localPath);
      }

      const scryfallId = cardData.scryfallData.id;
      const [firstChar, secondChar] = scryfallId.slice(0, 2);
      const imageUrl = `https://cards.scryfall.io/large/${effectiveFace}/${firstChar}/${secondChar}/${scryfallId}.jpg`;

      console.log(
        `Fetching and caching ${effectiveFace} image from: ${imageUrl}`
      );

      const imgResp = await fetch(imageUrl);
      if (!imgResp.ok) {
        console.error(`Scryfall image fetch failed: ${imgResp.status}`);
        return res.status(404).json({ error: "Image not found" });
      }

      const fileStream = fs.createWriteStream(localPath);
      await pipeline(imgResp.body as any, fileStream);
      return res.sendFile(localPath);
    } catch (err) {
      console.error("Image handling error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

async function ensureSetSvgsCached() {
  if (!allPrintings) return;
  const setsDir = path.join(__dirname, "cache", "sets");
  fs.mkdirSync(setsDir, { recursive: true });
  const codes = Object.keys(allPrintings.data);
  for (const code of codes) {
    const localPng = path.join(setsDir, `${code.toLowerCase()}.png`);
    if (fs.existsSync(localPng)) {
      console.log(`Set image already cached for ${code}`);
      continue;
    }
    const url = `https://svgs.scryfall.io/sets/${code.toLowerCase()}.svg`;
    console.log(`Fetching set svg from: ${url}`);
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.error(`Failed to fetch SVG for set ${code}`);
        continue;
      }
      const svgBuffer = await resp.buffer();
      const pngBuffer = await sharp(svgBuffer).png().toBuffer();
      fs.writeFileSync(localPng, pngBuffer);
      console.log(`Cached set image for ${code}`);
    } catch (err) {
      console.error(`Error fetching/converting set ${code}`, err);
    }
  }
}

app.get("/setimages/:setCode", (req: Request, res: Response) => {
  const setCode = req.params.setCode.toLowerCase();
  const filePath = path.join(__dirname, "cache", "sets", `${setCode}.png`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Set image not found" });
  }
  return res.sendFile(filePath);
});

// -------------- MAIN STARTUP --------------
async function main() {
  try {
    await ensureAllPrintingsUnzipped(ALL_PRINTINGS_PATH);
    await ensureFileExists(ALL_PRINTINGS_PATH, ALL_PRINTINGS_URL);
    await ensureFileExists(EXTENDED_DATA_PATH, EXTENDED_DATA_URL);
    await ensureScryfallAllCards(SCRYFALL_DATA_PATH, SCRYFALL_BULK_DATA_URL);

    allPrintings = loadAllPrintings(ALL_PRINTINGS_PATH);
    if (!allPrintings) {
      console.error("AllPrintings is null, exiting.");
      process.exit(1);
    }
    extendedDataArray = loadExtendedData(EXTENDED_DATA_PATH);
    console.log(`Loaded ${extendedDataArray.length} sealed products.`);

    await buildCombinedCards();
    await ensureSetSvgsCached();

    app.listen(PORT, () => {
      const networkInterfaces = os.networkInterfaces();
      const addresses: string[] = [];

      for (const iface of Object.values(networkInterfaces)) {
        if (iface) {
          iface.forEach((details) => {
            if (details.family === "IPv4" && !details.internal) {
              addresses.push(details.address);
            }
          });
        }
      }

      if (addresses.length > 0) {
        console.log(`Server running on:`);
        addresses.forEach((addr) => console.log(`  http://${addr}:${PORT}`));
      } else {
        console.log(`Server running on localhost:${PORT}`);
      }
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
