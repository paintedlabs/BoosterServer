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
  AllPrintingsSealedProduct,
  CombinedSealedProduct,
} from "../types";
import { TCGCSVProduct, TCGCSVPrice } from "../types/tcgcsv";
import { NotFoundError } from "../utils/errors";
import { TCGCSVService } from "./tcgcsvService";

export class MTGDataService implements DataService {
  private allPrintings: AllPrintings | null = null;
  private extendedDataArray: ExtendedSealedData[] = [];
  private combinedCards: Record<string, CombinedCard> = {};
  private tcgcsvService: TCGCSVService;

  // Pre-processed set mappings for fast lookups
  private setInfoMap: Map<string, any> = new Map();
  private enhancedProductsMap: Map<string, any[]> = new Map();

  // New combined sealed products that prioritize AllPrintings
  private combinedSealedProducts: Map<string, CombinedSealedProduct> =
    new Map();
  private combinedSealedProductsBySet: Map<string, CombinedSealedProduct[]> =
    new Map();

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

    // Pre-process TCGCSV data for fast lookup
    await this.preprocessTCGCSVData();

    // Pre-process set mappings for fast lookups
    await this.preprocessSetMappings();

    // Build combined sealed products that prioritize AllPrintings
    await this.buildCombinedSealedProducts();

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

  async getProductsWithAllData(setCode: string): Promise<
    Array<
      ExtendedSealedData & {
        tcgcsvData?: {
          product: TCGCSVProduct;
          prices: TCGCSVPrice[];
        };
      }
    >
  > {
    const setCodeParam = setCode.toUpperCase();
    const products = this.extendedDataArray.filter(
      (p) => p.set_code.toUpperCase() === setCodeParam
    );

    // Enhance each product with TCGCSV data if available
    const enhancedProducts = await Promise.all(
      products.map(async (product) => {
        try {
          // Try to get TCGCSV data for this product using the product code
          const tcgcsvData = await this.getProductTCGCSVData(product.code);

          return {
            ...product,
            ...(tcgcsvData && { tcgcsvData }),
          };
        } catch (error) {
          logger.warn(
            `Failed to get TCGCSV data for product ${product.code}:`,
            error
          );
          return product;
        }
      })
    );

    return enhancedProducts;
  }

  async getProductsWithCompleteData(setCode: string): Promise<
    Array<
      ExtendedSealedData & {
        tcgcsvData?: {
          product: TCGCSVProduct;
          prices: TCGCSVPrice[];
        };
        allPrintingsData?: AllPrintingsSealedProduct[];
      }
    >
  > {
    const setCodeParam = setCode.toUpperCase();
    const products = this.extendedDataArray.filter(
      (p) => p.set_code.toUpperCase() === setCodeParam
    );

    // Get AllPrintings data for this set
    const allPrintingsSet = this.allPrintings?.data[setCodeParam];
    const allPrintingsProducts = allPrintingsSet?.sealedProduct || [];

    // Enhance each product with TCGCSV data and AllPrintings data
    const enhancedProducts = await Promise.all(
      products.map(async (product) => {
        try {
          // Try to get TCGCSV data for this product using the product code
          const tcgcsvData = await this.getProductTCGCSVData(product.code);

          // Find matching AllPrintings products by name
          const matchingAllPrintingsProducts = allPrintingsProducts.filter(
            (apProduct) => this.productsMatch(product, apProduct)
          );

          return {
            ...product,
            ...(tcgcsvData && { tcgcsvData }),
            ...(matchingAllPrintingsProducts.length > 0 && {
              allPrintingsData: matchingAllPrintingsProducts,
            }),
          };
        } catch (error) {
          logger.warn(
            `Failed to get complete data for product ${product.code}:`,
            error
          );
          return product;
        }
      })
    );

    return enhancedProducts;
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

  /**
   * Get all pre-processed TCGCSV products
   */
  getTCGCSVProducts(): Array<{
    product: TCGCSVProduct;
    prices: TCGCSVPrice[];
  }> {
    return this.tcgcsvService.getAllProducts();
  }

  /**
   * Get pre-processed set information (O(1) lookup)
   */
  getSetInfo(setCode: string): any | null {
    const setCodeUpper = setCode.toUpperCase();
    return this.setInfoMap.get(setCodeUpper) || null;
  }

  /**
   * Get pre-processed enhanced products for a set (O(1) lookup)
   */
  getEnhancedProducts(setCode: string): any[] {
    const setCodeUpper = setCode.toUpperCase();
    return this.enhancedProductsMap.get(setCodeUpper) || [];
  }

  /**
   * Get all pre-processed set codes
   */
  getPreprocessedSetCodes(): string[] {
    return Array.from(this.setInfoMap.keys());
  }

  /**
   * Get statistics about pre-processed set mappings
   */
  getSetMappingStats(): {
    totalSets: number;
    totalEnhancedProducts: number;
    setsWithMtgJsonData: number;
    setsWithTcgcsvMapping: number;
  } {
    const totalSets = this.setInfoMap.size;
    const totalEnhancedProducts = Array.from(
      this.enhancedProductsMap.values()
    ).flat().length;
    const setsWithMtgJsonData = Array.from(this.setInfoMap.values()).filter(
      (info) => info.mtgJson.hasAllPrintingsData
    ).length;
    const setsWithTcgcsvMapping = Array.from(this.setInfoMap.values()).filter(
      (info) => info.tcgcsv.isMapped
    ).length;

    return {
      totalSets,
      totalEnhancedProducts,
      setsWithMtgJsonData,
      setsWithTcgcsvMapping,
    };
  }

  // New methods for AllPrintings-prioritized sealed products

  /**
   * Get combined sealed products for a set that prioritize AllPrintings data
   */
  getCombinedSealedProducts(setCode: string): CombinedSealedProduct[] {
    const setCodeUpper = setCode.toUpperCase();
    return this.combinedSealedProductsBySet.get(setCodeUpper) || [];
  }

  /**
   * Get a specific combined sealed product by UUID
   */
  getCombinedSealedProductByUuid(uuid: string): CombinedSealedProduct | null {
    return this.combinedSealedProducts.get(uuid) || null;
  }

  /**
   * Open a combined sealed product using AllPrintings data with fallback to ExtendedData
   */
  openCombinedSealedProduct(uuid: string): PackResponse {
    const product = this.combinedSealedProducts.get(uuid);
    if (!product) {
      throw new NotFoundError(`Sealed product with UUID ${uuid} not found`);
    }

    // If we have extended data, use it for pack generation
    if (product.extendedData) {
      const extendedProduct: ExtendedSealedData = {
        name: product.name,
        code: product.extendedData.code,
        set_code: product.setCode,
        set_name: product.setName,
        boosters: product.extendedData.boosters,
        sheets: product.extendedData.sheets,
        source_set_codes: product.extendedData.source_set_codes,
      };
      const pack = this.generatePack(extendedProduct);
      return { pack };
    }

    // Otherwise, try to generate pack from AllPrintings contents
    const pack = this.generatePackFromAllPrintings(product);
    return { pack };
  }

  /**
   * Open a combined sealed product with pricing data
   */
  async openCombinedSealedProductWithPricing(
    uuid: string
  ): Promise<PackResponseWithPricing> {
    const product = this.combinedSealedProducts.get(uuid);
    if (!product) {
      throw new NotFoundError(`Sealed product with UUID ${uuid} not found`);
    }

    // If we have extended data, use it for pack generation
    if (product.extendedData) {
      const extendedProduct: ExtendedSealedData = {
        name: product.name,
        code: product.extendedData.code,
        set_code: product.setCode,
        set_name: product.setName,
        boosters: product.extendedData.boosters,
        sheets: product.extendedData.sheets,
        source_set_codes: product.extendedData.source_set_codes,
      };
      const pack = await this.generatePackWithTCGCSV(extendedProduct);

      // Calculate pricing information
      let totalValue = 0;

      for (const card of pack) {
        if (card.tcgcsvData) {
          const bestPrice = this.tcgcsvService.getBestPrice(
            card.tcgcsvData.product,
            card.tcgcsvData.prices
          );
          if (bestPrice) {
            totalValue += bestPrice;
          }
        }
      }

      return {
        pack,
        pricing: {
          ...(product.tcgcsvData?.product.productId && {
            productId: product.tcgcsvData.product.productId,
          }),
          ...(totalValue > 0 && { priceStats: { marketPrice: totalValue } }),
          lastUpdated: new Date().toISOString(),
        },
      };
    }

    // Otherwise, try to generate pack from AllPrintings contents
    const pack = await this.generatePackFromAllPrintingsWithPricing(product);
    return pack;
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

    // First, fetch the bulk data metadata to get the latest URL
    logger.info(
      `Fetching Scryfall bulk data metadata from: ${config.data.scryfallBulkDataUrl}`
    );
    const bulkDataResponse = await fetch(config.data.scryfallBulkDataUrl);

    if (!bulkDataResponse.ok) {
      throw new Error(
        `Scryfall bulk data metadata fetch failed: ${bulkDataResponse.status} ${bulkDataResponse.statusText}`
      );
    }

    const bulkData =
      (await bulkDataResponse.json()) as ScryfallTypes.IScryfallList<ScryfallTypes.IScryfallBulkData>;

    // Find the "all_cards" bulk data entry
    const allCardsBulkData = bulkData.data.find(
      (item) => item.type === "all_cards"
    );

    if (!allCardsBulkData) {
      throw new Error(
        "Could not find 'all_cards' bulk data in Scryfall API response"
      );
    }

    logger.info(
      `Found latest Scryfall all-cards data: ${allCardsBulkData.name} (updated: ${allCardsBulkData.updated_at})`
    );
    logger.info(`Downloading from: ${allCardsBulkData.download_uri}`);

    const response = await fetch(allCardsBulkData.download_uri);
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
    let tcgcsvDataCount = 0;

    for (const setCode of Object.keys(this.allPrintings.data)) {
      const setObj = this.allPrintings.data[setCode];
      if (!setObj) continue;

      for (const card of setObj.cards) {
        const scryId = card.identifiers?.scryfallId;
        const scryData = scryId ? scryfallMap[scryId] : undefined;

        // Check if card has TCGPlayer product ID for potential TCGCSV data
        const tcgplayerProductId = card.identifiers?.["tcgplayerProductId"];

        // Try to get pre-processed TCGCSV data
        let tcgcsvData = undefined;
        if (tcgplayerProductId) {
          tcgcsvData =
            this.tcgcsvService.getProductByTcgplayerIdFast(tcgplayerProductId);
          if (tcgcsvData) {
            tcgcsvDataCount++;
          }
        }

        this.combinedCards[card.uuid] = {
          allPrintingsData: card,
          ...(scryData && { scryfallData: scryData }),
          ...(tcgcsvData && { tcgcsvData: tcgcsvData }),
        };

        if (tcgplayerProductId) {
          tcgcsvCount++;
        }
        count++;
      }
    }

    logger.info(
      `Built combined data for ${count} cards. ${tcgcsvCount} cards have TCGPlayer product IDs, ${tcgcsvDataCount} cards have pre-loaded TCGCSV data.`
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

    // First try to get from pre-processed data
    const tcgcsvData =
      this.tcgcsvService.getProductByTcgplayerIdFast(tcgplayerProductId);
    if (tcgcsvData) {
      // Update the card with TCGCSV data
      this.combinedCards[cardUuid] = {
        ...card,
        tcgcsvData,
      };

      logger.debug(
        `Loaded TCGCSV data for card ${cardUuid} from pre-processed map (TCGPlayer ID: ${tcgplayerProductId})`
      );
      return this.combinedCards[cardUuid] || null;
    }

    // Fallback to the old method if not found in pre-processed data
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
          `Loaded TCGCSV data for card ${cardUuid} via API call (TCGPlayer ID: ${tcgplayerProductId})`
        );
        return this.combinedCards[cardUuid] || null;
      }
    } catch (error) {
      logger.error(`Error loading TCGCSV data for card ${cardUuid}:`, error);
    }

    return card; // Return card without TCGCSV data if fetch failed
  }

  /**
   * Get TCGCSV pre-processing statistics
   */
  getTCGCSVStats(): {
    preprocessedProducts: number;
    totalCards: number;
    cardsWithTCGPlayerId: number;
    cardsWithTCGCSVData: number;
  } {
    let cardsWithTCGPlayerId = 0;
    let cardsWithTCGCSVData = 0;

    for (const card of Object.values(this.combinedCards)) {
      const tcgplayerProductId =
        card.allPrintingsData.identifiers?.["tcgplayerProductId"];
      if (tcgplayerProductId) {
        cardsWithTCGPlayerId++;
        if (card.tcgcsvData) {
          cardsWithTCGCSVData++;
        }
      }
    }

    return {
      preprocessedProducts:
        this.tcgcsvService.getPreprocessingStats().totalProducts,
      totalCards: Object.keys(this.combinedCards).length,
      cardsWithTCGPlayerId,
      cardsWithTCGCSVData,
    };
  }

  /**
   * Pre-process TCGCSV data to create a fast lookup map
   */
  private async preprocessTCGCSVData(): Promise<void> {
    logger.info("Pre-processing TCGCSV data for fast lookup...");

    try {
      // Use the new fast pre-processing method from TCGCSVService
      await this.tcgcsvService.preprocessAllData();

      // Get statistics for logging
      const stats = this.tcgcsvService.getPreprocessingStats();
      logger.info(
        `TCGCSV pre-processing complete: ${stats.totalProducts} products with ${stats.totalPrices} total prices`
      );

      // Build comprehensive product mappings for all products
      await this.tcgcsvService.buildProductMappings();
      logger.info("Product mappings built successfully");
    } catch (error) {
      logger.error("Error during TCGCSV pre-processing:", error);
      // Don't fail initialization if TCGCSV pre-processing fails
    }
  }

  private async preprocessSetMappings(): Promise<void> {
    logger.info("Pre-processing set mappings for fast lookups...");
    try {
      // Get all set codes from extended data
      const setCodes = new Set<string>();

      for (const product of this.extendedDataArray) {
        setCodes.add(product.set_code.toUpperCase());
      }

      // Process each set
      for (const setCode of setCodes) {
        const extendedProducts = this.extendedDataArray.filter(
          (p) => p.set_code.toUpperCase() === setCode
        );

        const mtgJsonSet = this.allPrintings?.data[setCode];
        const mtgJsonSealedProducts = mtgJsonSet?.sealedProduct || [];

        // Build set info
        const setInfo = {
          setCode,
          setName: mtgJsonSet?.name || extendedProducts[0]?.set_name || setCode,
          mtgJson: {
            hasAllPrintingsData: !!mtgJsonSet,
            sealedProductCount: mtgJsonSealedProducts.length,
          },
          tcgcsv: {
            isMapped: false, // Will be updated during TCGCSV preprocessing
            groupId: null,
            categoryId: null,
          },
          extendedData: {
            productCount: extendedProducts.length,
          },
        };

        this.setInfoMap.set(setCode, setInfo);

        // Build enhanced products for this set
        const enhancedProducts = await Promise.all(
          extendedProducts.map(async (product) => {
            // Get TCGCSV data if available
            let tcgcsvData = null;
            try {
              tcgcsvData = await this.getProductTCGCSVData(product.code);
            } catch (error) {
              // TCGCSV data not available for this product
            }

            // Find matching MTGJson sealed products using enhanced mapping
            const matchingMtgJsonProducts = this.findMatchingMtgJsonProducts(
              product,
              mtgJsonSealedProducts
            );

            return {
              // Extended Data
              name: product.name,
              code: product.code,
              set_code: product.set_code,
              set_name: product.set_name,
              boosters: product.boosters,
              sheets: product.sheets,
              source_set_codes: product.source_set_codes,

              // MTGJson Identifiers
              mtgJsonIdentifiers: matchingMtgJsonProducts.map((mp: any) => ({
                uuid: mp.uuid,
                name: mp.name,
                category: mp.category,
                cardCount: mp.cardCount,
                subtype: mp.subtype,
                releaseDate: mp.releaseDate,
                identifiers: mp.identifiers,
                purchaseUrls: mp.purchaseUrls,
              })),

              // TCGCSV Data
              tcgcsvData: tcgcsvData
                ? {
                    product: tcgcsvData.product,
                    prices: tcgcsvData.prices,
                    bestPrice: this.tcgcsvService.getBestPrice(
                      tcgcsvData.product,
                      tcgcsvData.prices
                    ),
                    priceStats: this.tcgcsvService.getPriceStats(
                      tcgcsvData.product,
                      tcgcsvData.prices
                    ),
                  }
                : null,

              // Mapping Information
              mappings: {
                mtgJsonMatches: matchingMtgJsonProducts.length,
                tcgcsvMapped: !!tcgcsvData,
              },
            };
          })
        );

        this.enhancedProductsMap.set(setCode, enhancedProducts);
      }

      logger.info(
        `Pre-processed ${this.setInfoMap.size} sets with enhanced product mappings`
      );
    } catch (error) {
      logger.error("Error pre-processing set mappings:", error);
    }
  }

  /**
   * Build combined sealed products that prioritize AllPrintings data
   */
  private async buildCombinedSealedProducts(): Promise<void> {
    logger.info(
      "Building combined sealed products that prioritize AllPrintings..."
    );

    if (!this.allPrintings) {
      logger.warn(
        "AllPrintings data not available, skipping combined sealed products build"
      );
      return;
    }

    let totalProducts = 0;
    let productsWithExtendedData = 0;
    let productsWithTCGCSV = 0;

    // Process each set in AllPrintings
    for (const [setCode, setData] of Object.entries(this.allPrintings.data)) {
      if (!setData.sealedProduct || setData.sealedProduct.length === 0) {
        continue;
      }

      const setProducts: CombinedSealedProduct[] = [];

      // Process each sealed product in the set
      for (const sealedProduct of setData.sealedProduct) {
        // Find matching ExtendedData product
        const matchingExtendedProduct = this.findMatchingExtendedProduct(
          sealedProduct,
          setCode
        );

        // Try to get TCGCSV data
        let tcgcsvData = null;
        if (sealedProduct.identifiers?.tcgplayerProductId) {
          try {
            tcgcsvData = this.tcgcsvService.getProductByTcgplayerIdFast(
              sealedProduct.identifiers.tcgplayerProductId.toString()
            );
          } catch (error) {
            // TCGCSV data not available
          }
        }

        // Create combined product
        const combinedProduct: CombinedSealedProduct = {
          // AllPrintings data
          uuid: sealedProduct.uuid,
          name: sealedProduct.name,
          category: sealedProduct.category,
          ...(sealedProduct.cardCount && {
            cardCount: sealedProduct.cardCount,
          }),
          ...(sealedProduct.releaseDate && {
            releaseDate: sealedProduct.releaseDate,
          }),
          ...(sealedProduct.subtype && { subtype: sealedProduct.subtype }),
          ...(sealedProduct.identifiers && {
            identifiers: sealedProduct.identifiers,
          }),
          ...(sealedProduct.purchaseUrls && {
            purchaseUrls: sealedProduct.purchaseUrls,
          }),
          ...(sealedProduct.contents && { contents: sealedProduct.contents }),

          // Set information
          setCode: setCode.toUpperCase(),
          setName: setData.name,

          // Extended data (if available)
          ...(matchingExtendedProduct && {
            extendedData: {
              code: matchingExtendedProduct.code,
              boosters: matchingExtendedProduct.boosters,
              sheets: matchingExtendedProduct.sheets,
              source_set_codes: matchingExtendedProduct.source_set_codes,
            },
          }),

          // TCGCSV data (if available)
          ...(tcgcsvData && { tcgcsvData }),
        };

        this.combinedSealedProducts.set(sealedProduct.uuid, combinedProduct);
        setProducts.push(combinedProduct);
        totalProducts++;

        if (matchingExtendedProduct) {
          productsWithExtendedData++;
        }
        if (tcgcsvData) {
          productsWithTCGCSV++;
        }
      }

      this.combinedSealedProductsBySet.set(setCode.toUpperCase(), setProducts);
    }

    logger.info(
      `Built ${totalProducts} combined sealed products: ` +
        `${productsWithExtendedData} with ExtendedData, ` +
        `${productsWithTCGCSV} with TCGCSV data`
    );
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

  /**
   * Get TCGCSV data for a specific product code
   */
  private async getProductTCGCSVData(productCode: string): Promise<{
    product: TCGCSVProduct;
    prices: TCGCSVPrice[];
  } | null> {
    try {
      // Use the TCGCSV service to get pricing data for this product
      // This will now use the preprocessed data for fast lookup
      return await this.tcgcsvService.getPricingByProductCode(productCode);
    } catch (error) {
      logger.warn(
        `Failed to get TCGCSV data for product ${productCode}:`,
        error
      );
      return null;
    }
  }

  private productsMatch(
    product: ExtendedSealedData,
    allPrintingsProduct: AllPrintingsSealedProduct
  ): boolean {
    const normalizedProductName = product.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const normalizedAllPrintingsName = allPrintingsProduct.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return normalizedProductName === normalizedAllPrintingsName;
  }

  /**
   * Enhanced mapping function to match Extended Data products to MTGJson sealed products
   */
  private findMatchingMtgJsonProducts(
    extendedProduct: ExtendedSealedData,
    mtgJsonSealedProducts: AllPrintingsSealedProduct[]
  ): AllPrintingsSealedProduct[] {
    if (!mtgJsonSealedProducts || mtgJsonSealedProducts.length === 0) {
      return [];
    }

    const normalizeName = (name: string) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ") // Remove special characters
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
    };

    const extendedName = normalizeName(extendedProduct.name);
    const extendedCode = extendedProduct.code.toLowerCase();

    // Score each potential match
    const scoredMatches = mtgJsonSealedProducts.map((mtgJsonProduct) => {
      const mtgJsonName = normalizeName(mtgJsonProduct.name);
      const mtgJsonCategory = mtgJsonProduct.category?.toLowerCase() || "";
      const mtgJsonSubtype = mtgJsonProduct.subtype?.toLowerCase() || "";

      let score = 0;
      let matchType = "none";
      let matchReason = "";

      // 1. Exact name match (highest priority)
      if (extendedName === mtgJsonName) {
        score = 100;
        matchType = "exact_name";
        matchReason = "Exact name match";
      }
      // 2. Contains match (one name contains the other)
      else if (
        extendedName.includes(mtgJsonName) ||
        mtgJsonName.includes(extendedName)
      ) {
        score = 85;
        matchType = "contains";
        matchReason = "Name contains match";
      }
      // 3. Word-based matching
      else {
        const extendedWords = extendedName
          .split(" ")
          .filter((w) => w.length > 2);
        const mtgJsonWords = mtgJsonName.split(" ").filter((w) => w.length > 2);

        if (extendedWords.length > 0 && mtgJsonWords.length > 0) {
          const matchingWords = extendedWords.filter((word) =>
            mtgJsonWords.some(
              (mtgJsonWord) =>
                mtgJsonWord.includes(word) || word.includes(mtgJsonWord)
            )
          );

          const wordMatchRatio =
            matchingWords.length /
            Math.max(extendedWords.length, mtgJsonWords.length);

          if (wordMatchRatio >= 0.8) {
            score = 80;
            matchType = "word_match_high";
            matchReason = `High word match (${Math.round(wordMatchRatio * 100)}%)`;
          } else if (wordMatchRatio >= 0.6) {
            score = 70;
            matchType = "word_match_medium";
            matchReason = `Medium word match (${Math.round(wordMatchRatio * 100)}%)`;
          } else if (wordMatchRatio >= 0.4) {
            score = 50;
            matchType = "word_match_low";
            matchReason = `Low word match (${Math.round(wordMatchRatio * 100)}%)`;
          }
        }
      }

      // 4. Product type matching based on Extended Data code patterns
      const productTypeBonus = this.getProductTypeMatchBonus(
        extendedCode,
        mtgJsonCategory,
        mtgJsonSubtype
      );
      score += productTypeBonus.bonus;
      if (productTypeBonus.bonus > 0) {
        matchReason += ` + ${productTypeBonus.bonus} (${productTypeBonus.reason})`;
      }

      // 5. Set code matching
      if (
        extendedProduct.set_code.toLowerCase() ===
        mtgJsonProduct.name.toLowerCase().split(" ").pop()
      ) {
        score += 10;
        matchReason += " + 10 (set code match)";
      }

      // 6. Booster type matching
      const boosterTypeBonus = this.getBoosterTypeMatchBonus(
        extendedProduct,
        mtgJsonProduct
      );
      score += boosterTypeBonus.bonus;
      if (boosterTypeBonus.bonus > 0) {
        matchReason += ` + ${boosterTypeBonus.bonus} (${boosterTypeBonus.reason})`;
      }

      return {
        product: mtgJsonProduct,
        score,
        matchType,
        matchReason,
        extendedName,
        mtgJsonName,
        extendedCode,
        mtgJsonCategory,
        mtgJsonSubtype,
      };
    });

    // Sort by score (highest first) and filter by minimum threshold
    scoredMatches.sort((a, b) => b.score - a.score);

    // Return products with score >= 40 (adjustable threshold)
    const threshold = 40;
    const matches = scoredMatches.filter((match) => match.score >= threshold);

    // Log the best matches for debugging
    if (matches.length > 0) {
      const bestMatch = matches[0];
      if (bestMatch) {
        logger.debug(
          `Best match for "${extendedProduct.name}" (${extendedProduct.code}): ` +
            `"${bestMatch.mtgJsonName}" (score: ${bestMatch.score}, type: ${bestMatch.matchType}) - ${bestMatch.matchReason}`
        );
      }
    } else {
      logger.debug(
        `No good matches found for "${extendedProduct.name}" (${extendedProduct.code})`
      );
    }

    return matches.map((match) => match.product);
  }

  /**
   * Find matching ExtendedData product for an AllPrintings sealed product
   */
  private findMatchingExtendedProduct(
    allPrintingsProduct: AllPrintingsSealedProduct,
    setCode: string
  ): ExtendedSealedData | null {
    const setCodeUpper = setCode.toUpperCase();
    const extendedProducts = this.extendedDataArray.filter(
      (p) => p.set_code.toUpperCase() === setCodeUpper
    );

    if (extendedProducts.length === 0) {
      return null;
    }

    // Use the same matching logic as productsMatch but in reverse
    const matches = extendedProducts
      .map((extendedProduct) => {
        const score = this.calculateProductMatchScore(
          extendedProduct,
          allPrintingsProduct
        );
        return { product: extendedProduct, score };
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score);

    return matches.length > 0 && matches[0] ? matches[0].product : null;
  }

  /**
   * Calculate match score between ExtendedData and AllPrintings products
   */
  private calculateProductMatchScore(
    extendedProduct: ExtendedSealedData,
    allPrintingsProduct: AllPrintingsSealedProduct
  ): number {
    let score = 0;

    // Normalize names for comparison
    const normalizeName = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]/g, "");

    const extendedName = normalizeName(extendedProduct.name);
    const allPrintingsName = normalizeName(allPrintingsProduct.name);

    // Exact name match
    if (extendedName === allPrintingsName) {
      score += 100;
    }
    // Partial name match
    else if (
      extendedName.includes(allPrintingsName) ||
      allPrintingsName.includes(extendedName)
    ) {
      score += 50;
    }

    // Product type matching
    const typeBonus = this.getProductTypeMatchBonus(
      extendedProduct.code,
      allPrintingsProduct.category,
      allPrintingsProduct.subtype || ""
    );
    score += typeBonus.bonus;

    // Booster type matching
    const boosterBonus = this.getBoosterTypeMatchBonus(
      extendedProduct,
      allPrintingsProduct
    );
    score += boosterBonus.bonus;

    return score;
  }

  /**
   * Get bonus score for product type matching
   */
  private getProductTypeMatchBonus(
    extendedCode: string,
    mtgJsonCategory: string,
    mtgJsonSubtype: string
  ): { bonus: number; reason: string } {
    let bonus = 0;
    let reason = "";

    // Booster pack matching
    if (
      extendedCode.includes("draft") &&
      (mtgJsonSubtype.includes("draft") || mtgJsonCategory.includes("booster"))
    ) {
      bonus += 15;
      reason = "draft booster";
    } else if (
      extendedCode.includes("set") &&
      (mtgJsonSubtype.includes("set") || mtgJsonCategory.includes("booster"))
    ) {
      bonus += 15;
      reason = "set booster";
    } else if (
      extendedCode.includes("collector") &&
      (mtgJsonSubtype.includes("collector") ||
        mtgJsonCategory.includes("booster"))
    ) {
      bonus += 15;
      reason = "collector booster";
    } else if (
      extendedCode.includes("prerelease") &&
      (mtgJsonSubtype.includes("prerelease") ||
        mtgJsonCategory.includes("prerelease"))
    ) {
      bonus += 15;
      reason = "prerelease";
    }

    // Box vs Pack matching
    if (
      extendedCode.includes("box") &&
      mtgJsonCategory.includes("booster_box")
    ) {
      bonus += 10;
      reason += " + box";
    } else if (
      extendedCode.includes("pack") &&
      mtgJsonCategory.includes("booster_pack")
    ) {
      bonus += 10;
      reason += " + pack";
    } else if (
      extendedCode.includes("case") &&
      mtgJsonCategory.includes("booster_case")
    ) {
      bonus += 10;
      reason += " + case";
    }

    return { bonus, reason: reason.trim() };
  }

  /**
   * Get bonus score for booster type matching based on Extended Data structure
   */
  private getBoosterTypeMatchBonus(
    extendedProduct: ExtendedSealedData,
    mtgJsonProduct: AllPrintingsSealedProduct
  ): { bonus: number; reason: string } {
    let bonus = 0;
    let reason = "";

    // Analyze Extended Data booster structure
    const hasFoilSheets = Object.keys(extendedProduct.sheets).some((sheet) =>
      sheet.includes("foil")
    );
    const hasSpecialSheets = Object.keys(extendedProduct.sheets).some(
      (sheet) =>
        sheet.includes("rare") ||
        sheet.includes("mythic") ||
        sheet.includes("special")
    );
    const sheetCount = Object.keys(extendedProduct.sheets).length;

    // Collector boosters typically have more sheets and foil sheets
    if (hasFoilSheets && hasSpecialSheets && sheetCount > 5) {
      if (mtgJsonProduct.subtype?.toLowerCase().includes("collector")) {
        bonus += 10;
        reason = "collector booster structure";
      }
    }
    // Draft boosters typically have fewer sheets
    else if (sheetCount <= 5 && !hasSpecialSheets) {
      if (mtgJsonProduct.subtype?.toLowerCase().includes("draft")) {
        bonus += 10;
        reason = "draft booster structure";
      }
    }

    return { bonus, reason };
  }

  /**
   * Generate a pack from AllPrintings sealed product contents
   */
  private generatePackFromAllPrintings(product: CombinedSealedProduct): Array<{
    sheet: string;
    allPrintingsData: any;
    scryfallData?: ScryfallTypes.IScryfallCard;
    tcgcsvData?: {
      product: TCGCSVProduct;
      prices: TCGCSVPrice[];
    };
  }> {
    const pack: Array<{
      sheet: string;
      allPrintingsData: any;
      scryfallData?: ScryfallTypes.IScryfallCard;
      tcgcsvData?: {
        product: TCGCSVProduct;
        prices: TCGCSVPrice[];
      };
    }> = [];

    if (!product.contents) {
      logger.warn(`No contents data for product ${product.uuid}`);
      return pack;
    }

    // Handle different content types
    if (product.contents.card) {
      // Direct card list
      for (const cardContent of product.contents.card) {
        const cardUuid = cardContent.uuid;
        const combined = this.combinedCards[cardUuid];

        if (combined) {
          pack.push({
            sheet: "card",
            allPrintingsData: combined.allPrintingsData,
            ...(combined.scryfallData && {
              scryfallData: combined.scryfallData,
            }),
            ...(combined.tcgcsvData && { tcgcsvData: combined.tcgcsvData }),
          });
        }
      }
    } else if (product.contents.pack) {
      // Contains other packs - this is more complex and would need recursive handling
      logger.warn(
        `Pack contains other packs - not yet implemented for ${product.uuid}`
      );
    } else if (product.contents.sealed) {
      // Contains other sealed products - this is more complex and would need recursive handling
      logger.warn(
        `Pack contains other sealed products - not yet implemented for ${product.uuid}`
      );
    }

    return pack;
  }

  /**
   * Generate a pack from AllPrintings sealed product contents with pricing
   */
  private async generatePackFromAllPrintingsWithPricing(
    product: CombinedSealedProduct
  ): Promise<PackResponseWithPricing> {
    const pack = this.generatePackFromAllPrintings(product);

    // Calculate pricing information
    let totalValue = 0;

    for (const card of pack) {
      if (card.tcgcsvData) {
        const bestPrice = this.tcgcsvService.getBestPrice(
          card.tcgcsvData.product,
          card.tcgcsvData.prices
        );
        if (bestPrice) {
          totalValue += bestPrice;
        }
      }
    }

    return {
      pack,
      pricing: {
        ...(product.tcgcsvData?.product.productId && {
          productId: product.tcgcsvData.product.productId,
        }),
        ...(totalValue > 0 && { priceStats: { marketPrice: totalValue } }),
        lastUpdated: new Date().toISOString(),
      },
    };
  }
}
