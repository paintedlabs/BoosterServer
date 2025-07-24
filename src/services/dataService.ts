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
  PackResponseWithPricing,
} from "../types";
import { TCGCSVProduct, TCGCSVPrice } from "../types/tcgcsv";
import { NotFoundError } from "../utils/errors";
import { TCGCSVService } from "./tcgcsvService";

export class MTGDataService implements DataService {
  private allPrintings: AllPrintings | null = null;
  private extendedDataArray: ExtendedSealedData[] = [];
  private combinedCards: Record<string, CombinedCard> = {};
  private tcgcsvService: TCGCSVService;

  constructor() {
    this.tcgcsvService = new TCGCSVService();
  }

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

  async openProductWithPricing(
    productCode: string
  ): Promise<PackResponseWithPricing> {
    const product = this.extendedDataArray.find(
      (p) => p.code.toLowerCase() === productCode.toLowerCase()
    );

    if (!product) {
      throw new NotFoundError(`Product not found: ${productCode}`);
    }

    const pack = this.generatePack(product);
    const response: PackResponseWithPricing = { pack };

    // Try to get pricing data for this product
    try {
      // First, try to get the group ID for this set
      const groupId = this.tcgcsvService.getGroupIdForSet(product.set_code);

      if (!groupId) {
        logger.warn(`No group ID mapping found for set: ${product.set_code}`);
        return response;
      }

      // Get all sealed products with prices for this set
      const productsWithPrices =
        await this.tcgcsvService.getSealedProductsWithPrices(product.set_code);

      if (productsWithPrices.length === 0) {
        logger.warn(`No sealed products found for set: ${product.set_code}`);
        return response;
      }

      // Find the best matching product using enhanced name matching
      const matchingProduct = this.findBestProductMatch(
        product,
        productsWithPrices
      );

      if (matchingProduct) {
        const priceStats = this.tcgcsvService.getPriceStats(
          matchingProduct.product,
          matchingProduct.prices
        );

        if (priceStats) {
          response.pricing = {
            productId: matchingProduct.product.productId,
            priceStats: {
              lowPrice: priceStats.lowPrice,
              midPrice: priceStats.midPrice,
              highPrice: priceStats.highPrice,
              marketPrice: priceStats.marketPrice,
              directLowPrice: priceStats.directLowPrice,
            },
            lastUpdated: new Date().toISOString(),
          };
        }
      } else {
        logger.warn(
          `No matching product found for: ${product.name} in set ${product.set_code}`
        );
      }
    } catch (error) {
      logger.warn(
        `Failed to fetch pricing data for product ${productCode}:`,
        error
      );
      // Don't fail the request if pricing fails
    }

    return response;
  }

  openMultipleProducts(
    productCode: string,
    count: number
  ): MultiplePacksResponse {
    const packs: PackResponse[] = [];
    for (let i = 0; i < count; i++) {
      packs.push(this.openProduct(productCode));
    }
    return { packs };
  }

  async openProductWithCardPricing(productCode: string): Promise<PackResponse> {
    const product = this.extendedDataArray.find(
      (p) => p.code.toLowerCase() === productCode.toLowerCase()
    );

    if (!product) {
      throw new NotFoundError(`Product not found: ${productCode}`);
    }

    const pack = await this.generatePackWithTCGCSV(product);

    return {
      pack,
    };
  }

  async openMultipleProductsWithCardPricing(
    productCode: string,
    count: number
  ): Promise<MultiplePacksResponse> {
    const packs: PackResponse[] = [];
    for (let i = 0; i < count; i++) {
      const packResponse = await this.openProductWithCardPricing(productCode);
      packs.push(packResponse);
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
    let tcgcsvCount = 0;
    for (const setCode of Object.keys(this.allPrintings.data)) {
      const setObj = this.allPrintings.data[setCode];
      if (!setObj) continue;

      for (const card of setObj.cards) {
        const scryId = card.identifiers?.scryfallId;
        const scryData = scryId ? scryfallMap[scryId] : undefined;

        // Check if card has TCGPlayer product ID for potential TCGCSV data
        const tcgplayerProductId = card.identifiers?.["tcgplayerProductId"];

        this.combinedCards[card.uuid] = {
          allPrintingsData: card,
          ...(scryData && { scryfallData: scryData }),
          // TCGCSV data will be loaded on-demand when needed
        };

        if (tcgplayerProductId) {
          tcgcsvCount++;
        }
        count++;
      }
    }

    logger.info(
      `Built combined data for ${count} cards. ${tcgcsvCount} cards have TCGPlayer product IDs for potential TCGCSV data.`
    );
  }

  // New method to get TCGCSV data for a specific card
  async getCardWithTCGCSV(cardUuid: string): Promise<CombinedCard | null> {
    const card = this.combinedCards[cardUuid];
    if (!card) {
      return null;
    }

    // If TCGCSV data is already loaded, return the card as is
    if (card.tcgcsvData) {
      return card;
    }

    // Check if card has TCGPlayer product ID
    const tcgplayerProductId =
      card.allPrintingsData.identifiers?.["tcgplayerProductId"];
    if (!tcgplayerProductId) {
      return card; // No TCGPlayer ID, return card without TCGCSV data
    }

    try {
      // Fetch TCGCSV data for this card
      const tcgcsvData =
        await this.tcgcsvService.getProductByTcgplayerId(tcgplayerProductId);

      if (tcgcsvData) {
        // Update the card with TCGCSV data
        this.combinedCards[cardUuid] = {
          ...card,
          tcgcsvData,
        };

        logger.debug(
          `Loaded TCGCSV data for card ${cardUuid} (TCGPlayer ID: ${tcgplayerProductId})`
        );
        return this.combinedCards[cardUuid] || null;
      }
    } catch (error) {
      logger.error(`Error loading TCGCSV data for card ${cardUuid}:`, error);
    }

    return card; // Return card without TCGCSV data if fetch failed
  }

  private generatePack(product: ExtendedSealedData): Array<{
    sheet: string;
    allPrintingsData: any;
    scryfallData?: ScryfallTypes.IScryfallCard;
    tcgcsvData?: {
      product: TCGCSVProduct;
      prices: TCGCSVPrice[];
    };
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
      tcgcsvData?: {
        product: TCGCSVProduct;
        prices: TCGCSVPrice[];
      };
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
          ...(combined.tcgcsvData && { tcgcsvData: combined.tcgcsvData }),
        });
      }
    }

    return pack;
  }

  // Async version that fetches TCGCSV data for cards
  private async generatePackWithTCGCSV(product: ExtendedSealedData): Promise<
    Array<{
      sheet: string;
      allPrintingsData: any;
      scryfallData?: ScryfallTypes.IScryfallCard;
      tcgcsvData?: {
        product: TCGCSVProduct;
        prices: TCGCSVPrice[];
      };
    }>
  > {
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
      tcgcsvData?: {
        product: TCGCSVProduct;
        prices: TCGCSVPrice[];
      };
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

        // Get card with TCGCSV data
        const combined = await this.getCardWithTCGCSV(pickedUUID);
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
          ...(combined.tcgcsvData && { tcgcsvData: combined.tcgcsvData }),
        });
      }
    }

    return pack;
  }

  private findBestProductMatch(
    product: ExtendedSealedData,
    productsWithPrices: any[]
  ): any | null {
    if (productsWithPrices.length === 0) return null;

    // Normalize the product name for comparison
    const normalizeName = (name: string) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ") // Remove special characters
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
    };

    const normalizedProductName = normalizeName(product.name);

    // Score each potential match
    const scoredMatches = productsWithPrices.map((productWithPrice) => {
      const tcgcsvName = productWithPrice.product.name;
      const normalizedTcgcsvName = normalizeName(tcgcsvName);

      let score = 0;
      let matchType = "none";

      // Exact match after normalization
      if (normalizedProductName === normalizedTcgcsvName) {
        score = 100;
        matchType = "exact";
      }
      // Contains match (one name contains the other)
      else if (
        normalizedProductName.includes(normalizedTcgcsvName) ||
        normalizedTcgcsvName.includes(normalizedProductName)
      ) {
        score = 80;
        matchType = "contains";
      }
      // Word-based matching
      else {
        const productWords = normalizedProductName
          .split(" ")
          .filter((w) => w.length > 2);
        const tcgcsvWords = normalizedTcgcsvName
          .split(" ")
          .filter((w) => w.length > 2);

        if (productWords.length > 0 && tcgcsvWords.length > 0) {
          const matchingWords = productWords.filter((word) =>
            tcgcsvWords.some(
              (tcgcsvWord) =>
                tcgcsvWord.includes(word) || word.includes(tcgcsvWord)
            )
          );

          const wordMatchRatio =
            matchingWords.length /
            Math.max(productWords.length, tcgcsvWords.length);

          if (wordMatchRatio >= 0.7) {
            score = 70;
            matchType = "word_match_high";
          } else if (wordMatchRatio >= 0.5) {
            score = 50;
            matchType = "word_match_medium";
          } else if (wordMatchRatio >= 0.3) {
            score = 30;
            matchType = "word_match_low";
          }
        }
      }

      // Bonus for sealed products
      if (productWithPrice.product.isSealed) {
        score += 10;
      }

      // Bonus for pack/booster products
      const packKeywords = ["pack", "booster", "display"];
      const hasPackKeyword = packKeywords.some((keyword) =>
        normalizedTcgcsvName.includes(keyword)
      );
      if (hasPackKeyword) {
        score += 5;
      }

      return {
        productWithPrice,
        score,
        matchType,
        tcgcsvName,
      };
    });

    // Sort by score (highest first) and return the best match
    scoredMatches.sort((a, b) => b.score - a.score);

    const bestMatch = scoredMatches[0];

    if (bestMatch && bestMatch.score >= 30) {
      logger.info(
        `Best match for "${product.name}": "${bestMatch.tcgcsvName}" (score: ${bestMatch.score}, type: ${bestMatch.matchType})`
      );
      return bestMatch.productWithPrice;
    }

    return null;
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
