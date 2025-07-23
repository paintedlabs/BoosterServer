import * as fs from "fs";
import * as unzipper from "unzipper";
import fetch from "node-fetch";
import { pipeline } from "stream/promises";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { streamArray } from "stream-json/streamers/StreamArray";
import * as ScryfallTypes from "../types/scryfall";
import { config } from "../config";
import logger from "../utils/logger";
import {
  AllPrintings,
  ExtendedSealedData,
  CombinedCard,
  SetResponse,
  PackResponse,
  MultiplePacksResponse,
  DataService,
} from "../types";
import { NotFoundError, ValidationError } from "../utils/errors";

export class MTGDataService implements DataService {
  private allPrintings: AllPrintings | null = null;
  private extendedDataArray: ExtendedSealedData[] = [];
  private combinedCards: Record<string, CombinedCard> = {};

  /**
   * Initialize the data service by loading all required data files
   */
  async initialize(): Promise<void> {
    logger.info("Initializing MTG Data Service...");

    await this.ensureAllPrintingsUnzipped();
    await this.ensureFileExists(
      config.data.localPaths.extendedData,
      config.data.extendedDataUrl
    );
    await this.ensureScryfallAllCards();

    this.allPrintings = this.loadAllPrintings();
    if (!this.allPrintings) {
      throw new Error("Failed to load AllPrintings data");
    }

    this.extendedDataArray = this.loadExtendedData();
    logger.info(`Loaded ${this.extendedDataArray.length} sealed products`);

    await this.buildCombinedCards();
    logger.info("MTG Data Service initialized successfully");
  }

  getAllPrintings(): AllPrintings | null {
    return this.allPrintings;
  }

  getExtendedData(): ExtendedSealedData[] {
    return this.extendedDataArray;
  }

  getCombinedCards(): Record<string, CombinedCard> {
    return this.combinedCards;
  }

  getSets(): SetResponse[] {
    const seenCodes = new Set<string>();
    const setsArray: SetResponse[] = [];

    for (const product of this.extendedDataArray) {
      const setCode = product.set_code.toUpperCase();

      if (!seenCodes.has(setCode) && this.allPrintings?.data[setCode]) {
        seenCodes.add(setCode);
        setsArray.push({
          code: setCode,
          name: this.allPrintings.data[setCode]!.name,
        });
      }
    }

    return setsArray;
  }

  getProducts(setCode: string): ExtendedSealedData[] {
    const setCodeParam = setCode.toUpperCase();
    return this.extendedDataArray.filter(
      (p) => p.set_code.toUpperCase() === setCodeParam
    );
  }

  openProduct(productCode: string): PackResponse {
    const product = this.extendedDataArray.find(
      (p) => p.code.toLowerCase() === productCode.toLowerCase()
    );

    if (!product) {
      throw new NotFoundError(`Product not found: ${productCode}`);
    }

    const pack = this.generatePack(product);
    return { pack };
  }

  openMultipleProducts(
    productCode: string,
    count: number
  ): MultiplePacksResponse {
    if (isNaN(count) || count <= 0) {
      throw new ValidationError("Invalid number of packs");
    }

    const packs: PackResponse[] = [];
    for (let i = 0; i < count; i++) {
      const pack = this.openProduct(productCode);
      packs.push(pack);
    }

    return { packs };
  }

  private async ensureAllPrintingsUnzipped(): Promise<void> {
    const localJsonPath = config.data.localPaths.allPrintings;

    if (fs.existsSync(localJsonPath)) {
      logger.info(`Found local file: ${localJsonPath}`);
      return;
    }

    logger.info(`Fetching zip from: ${config.data.allPrintingsUrlZipped}`);
    const response = await fetch(config.data.allPrintingsUrlZipped);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch AllPrintings zip: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuf = await response.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuf);

    const directory = await unzipper.Open.buffer(zipBuffer);
    const zipEntry = directory.files.find(
      (f) => f.path === "AllPrintings.json"
    );

    if (!zipEntry) {
      throw new Error("Could not find AllPrintings.json in the ZIP");
    }

    const unzippedData = await zipEntry.buffer();
    fs.writeFileSync(localJsonPath, unzippedData);
    logger.info(`Saved unzipped file to: ${localJsonPath}`);
  }

  private async ensureFileExists(
    localPath: string,
    remoteUrl: string
  ): Promise<void> {
    if (fs.existsSync(localPath)) {
      logger.info(`Found local file: ${localPath}`);
      return;
    }

    logger.info(`Fetching from: ${remoteUrl}`);
    const resp = await fetch(remoteUrl);

    if (!resp.ok) {
      throw new Error(
        `Failed to fetch '${remoteUrl}': ${resp.status} ${resp.statusText}`
      );
    }

    const textData = await resp.text();
    fs.writeFileSync(localPath, textData, "utf-8");
    logger.info(`Saved file to: ${localPath}`);
  }

  private async ensureScryfallAllCards(): Promise<void> {
    const localPath = config.data.localPaths.scryfallData;

    if (fs.existsSync(localPath)) {
      logger.info(`Scryfall all-cards file found locally: ${localPath}`);
      return;
    }

    logger.info(`Downloading from: ${config.data.scryfallAllCardsUrl}`);
    const response = await fetch(config.data.scryfallAllCardsUrl);

    if (!response.ok) {
      throw new Error(
        `Scryfall bulk data fetch failed: ${response.status} ${response.statusText}`
      );
    }

    const fileStream = fs.createWriteStream(localPath);
    await pipeline(response.body as any, fileStream);
    logger.info(`Wrote Scryfall data to ${localPath}`);
  }

  private loadAllPrintings(): AllPrintings | null {
    try {
      const raw = fs.readFileSync(config.data.localPaths.allPrintings, "utf-8");
      return JSON.parse(raw) as AllPrintings;
    } catch (err) {
      logger.error("Failed to load AllPrintings", err);
      return null;
    }
  }

  private loadExtendedData(): ExtendedSealedData[] {
    try {
      const raw = fs.readFileSync(config.data.localPaths.extendedData, "utf-8");
      return JSON.parse(raw) as ExtendedSealedData[];
    } catch (err) {
      logger.error("Failed to load extended data", err);
      return [];
    }
  }

  private async loadScryfallAllCardsStreamed(
    neededIds: Set<string>
  ): Promise<Record<string, ScryfallTypes.IScryfallCard>> {
    logger.info(
      `Streaming parse of Scryfall. Looking for ${neededIds.size} IDs.`
    );

    const scryfallMap: Record<string, ScryfallTypes.IScryfallCard> = {};

    const pipelineStream = chain([
      fs.createReadStream(config.data.localPaths.scryfallData),
      parser(),
      streamArray(),
    ]);

    for await (const chunk of pipelineStream) {
      const card = chunk.value as ScryfallTypes.IScryfallCard;
      if (card.id && neededIds.has(card.id)) {
        scryfallMap[card.id] = card;
      }
    }

    logger.info(
      `Found ${Object.keys(scryfallMap).length} matching Scryfall cards out of needed ${neededIds.size}.`
    );
    return scryfallMap;
  }

  private async buildCombinedCards(): Promise<void> {
    if (!this.allPrintings) return;

    const neededIds = new Set<string>();
    for (const setCode of Object.keys(this.allPrintings.data)) {
      const setObj = this.allPrintings.data[setCode];
      if (!setObj) continue;

      for (const card of setObj.cards) {
        const scryId = card.identifiers?.scryfallId;
        if (scryId) {
          neededIds.add(scryId);
        }
      }
    }

    logger.info(`We need Scryfall data for ${neededIds.size} cards.`);

    const scryfallMap = await this.loadScryfallAllCardsStreamed(neededIds);

    let count = 0;
    for (const setCode of Object.keys(this.allPrintings.data)) {
      const setObj = this.allPrintings.data[setCode];
      if (!setObj) continue;

      for (const card of setObj.cards) {
        const scryId = card.identifiers?.scryfallId;
        const scryData = scryId ? scryfallMap[scryId] : undefined;
        this.combinedCards[card.uuid] = {
          allPrintingsData: card,
          ...(scryData && { scryfallData: scryData }),
        };
        count++;
      }
    }

    logger.info(`Built combined data for ${count} cards.`);
  }

  private generatePack(product: ExtendedSealedData): Array<{
    sheet: string;
    allPrintingsData: any;
    scryfallData?: ScryfallTypes.IScryfallCard;
  }> {
    const localMap: Record<string, boolean> = {};
    for (let code of product.source_set_codes) {
      code = code.toUpperCase();
      const setObj = this.allPrintings?.data[code];
      if (!setObj) {
        logger.warn(`Set code '${code}' not found in AllPrintings`);
        continue;
      }
      for (const c of setObj.cards) {
        localMap[c.uuid] = true;
      }
    }

    const chosenBooster = this.pickBooster(product.boosters);
    if (!chosenBooster) {
      return [];
    }

    const pack: Array<{
      sheet: string;
      allPrintingsData: any;
      scryfallData?: ScryfallTypes.IScryfallCard;
    }> = [];

    for (const [sheetName, count] of Object.entries(chosenBooster.sheets)) {
      const sheet = product.sheets[sheetName];
      if (!sheet) {
        logger.warn(
          `No sheet data for sheet '${sheetName}' in product '${product.code}'`
        );
        continue;
      }

      for (let i = 0; i < count; i++) {
        const pickedUUID = this.pickCardFromSheet(sheet);
        if (!pickedUUID) continue;

        const combined = this.combinedCards[pickedUUID];
        if (!combined) {
          logger.warn(`No combined data for card uuid=${pickedUUID}`);
          continue;
        }
        if (!localMap[pickedUUID]) {
          logger.warn(`Card uuid=${pickedUUID} not in source_set_codes?`);
          continue;
        }

        pack.push({
          sheet: sheetName,
          allPrintingsData: combined.allPrintingsData,
          ...(combined.scryfallData && { scryfallData: combined.scryfallData }),
        });
      }
    }

    return pack;
  }

  private pickBooster(
    boosters: ExtendedSealedData["boosters"]
  ): ExtendedSealedData["boosters"][0] | null {
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

  private pickCardFromSheet(
    sheet: ExtendedSealedData["sheets"][string]
  ): string | null {
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
}
