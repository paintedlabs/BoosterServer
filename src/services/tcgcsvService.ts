import * as fs from "fs";
import * as path from "path";
import fetch from "node-fetch";
import {
  TCGCSVCategory,
  TCGCSVGroup,
  TCGCSVProduct,
  TCGCSVPrice,
  SetMapping,
  SetMappingsFile,
  SealedProductWithPrice,
  PriceStatistics,
} from "../types/tcgcsv";
import logger from "../utils/logger";

export class TCGCSVService {
  private baseURL = "https://tcgcsv.com/tcgplayer";
  private categories: TCGCSVCategory[] = [];
  private groups: Map<number, TCGCSVGroup[]> = new Map();
  private products: Map<number, TCGCSVProduct[]> = new Map();
  private prices: Map<number, TCGCSVPrice[]> = new Map();
  private setMappings: SetMapping[] = [];
  private productMappings: Map<string, number> = new Map(); // productCode -> TCGCSV productId
  private mappingsFilePath: string;

  // Pre-processed product map for O(1) lookups
  private productIdMap: Map<
    number,
    { product: TCGCSVProduct; prices: TCGCSVPrice[] }
  > = new Map();
  private isPreprocessed = false;

  constructor() {
    this.mappingsFilePath = path.join(
      process.cwd(),
      "data",
      "setMappings.json"
    );
    this.loadSetMappings();
    this.initializeProductMappings();
  }

  // MARK: - Categories
  async fetchCategories(): Promise<TCGCSVCategory[]> {
    try {
      const url = `${this.baseURL}/categories`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: any = await response.json();
      this.categories = data.results || [];

      logger.info(`Fetched ${this.categories.length} categories from TCGCSV`);
      return this.categories;
    } catch (error) {
      logger.error("Error fetching categories:", error);
      return [];
    }
  }

  // MARK: - Groups
  async fetchGroups(categoryId: number): Promise<TCGCSVGroup[]> {
    try {
      const url = `${this.baseURL}/${categoryId}/groups`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: any = await response.json();
      const groups = data.results || [];

      this.groups.set(categoryId, groups);
      logger.info(`Fetched ${groups.length} groups for category ${categoryId}`);
      return groups;
    } catch (error) {
      logger.error(`Error fetching groups for category ${categoryId}:`, error);
      return [];
    }
  }

  // MARK: - Products
  async fetchProducts(groupId: number): Promise<TCGCSVProduct[]> {
    try {
      const url = `${this.baseURL}/1/${groupId}/products`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: any = await response.json();
      const products = data.results || [];

      this.products.set(groupId, products);
      logger.info(`Fetched ${products.length} products for group ${groupId}`);
      return products;
    } catch (error) {
      logger.error(`Error fetching products for group ${groupId}:`, error);
      return [];
    }
  }

  // MARK: - Prices
  async fetchPrices(groupId: number): Promise<TCGCSVPrice[]> {
    try {
      const url = `${this.baseURL}/1/${groupId}/prices`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: any = await response.json();
      const prices = data.results || [];

      this.prices.set(groupId, prices);
      logger.info(`Fetched ${prices.length} prices for group ${groupId}`);
      return prices;
    } catch (error) {
      logger.error(`Error fetching prices for group ${groupId}:`, error);
      return [];
    }
  }

  // MARK: - Helper Methods
  async getMagicCategoryId(): Promise<number | null> {
    if (this.categories.length === 0) {
      await this.fetchCategories();
    }

    const magicCategory = this.categories.find((cat) => cat.name === "Magic");
    return magicCategory?.categoryId || null;
  }

  async findGroupByName(
    name: string,
    categoryId: number
  ): Promise<TCGCSVGroup | null> {
    let groups = this.groups.get(categoryId);

    if (!groups) {
      groups = await this.fetchGroups(categoryId);
    }

    return (
      groups.find(
        (group) => group.name.includes(name) || name.includes(group.name)
      ) || null
    );
  }

  async getSealedProducts(groupId: number): Promise<TCGCSVProduct[]> {
    let products = this.products.get(groupId);

    if (!products) {
      products = await this.fetchProducts(groupId);
    }

    return products.filter((product) => product.isSealed);
  }

  async getPricesForProducts(
    productIds: number[],
    groupId: number
  ): Promise<TCGCSVPrice[]> {
    let prices = this.prices.get(groupId);

    if (!prices) {
      prices = await this.fetchPrices(groupId);
    }

    return prices.filter((price) => productIds.includes(price.productId));
  }

  // MARK: - Set Mappings
  private loadSetMappings(): void {
    try {
      if (fs.existsSync(this.mappingsFilePath)) {
        const data = fs.readFileSync(this.mappingsFilePath, "utf8");
        const mappingsFile: SetMappingsFile = JSON.parse(data);
        this.setMappings = mappingsFile.mappings;
        logger.info(`Loaded ${this.setMappings.length} set mappings`);
      } else {
        logger.info("No set mappings file found, creating default mappings");
        this.createDefaultMappings();
      }
    } catch (error) {
      logger.error("Error loading set mappings:", error);
      this.createDefaultMappings();
    }
  }

  private initializeProductMappings(): void {
    // Initialize product mappings for known products
    // Format: productCode -> TCGCSV productId
    this.productMappings.set("fin-collector", 618892); // FINAL FANTASY - Collector Booster Pack
    this.productMappings.set("fin-play", 618889); // FINAL FANTASY - Play Booster Pack
    this.productMappings.set("lci-collector", 516613); // The Lost Caverns of Ixalan - Collector Booster Pack
    this.productMappings.set("lci-draft", 516618); // The Lost Caverns of Ixalan - Draft Booster Pack

    logger.info(`Initialized ${this.productMappings.size} product mappings`);
  }

  async getPricingByProductCode(productCode: string): Promise<{
    product: TCGCSVProduct;
    prices: TCGCSVPrice[];
  } | null> {
    const productId = this.productMappings.get(productCode);

    if (!productId) {
      logger.warn(`No product mapping found for: ${productCode}`);
      return null;
    }

    try {
      // Use the preprocessed data for fast lookup
      const productData = this.productIdMap.get(productId);

      if (productData) {
        logger.debug(
          `Found TCGCSV data for product ${productCode} in preprocessed map`
        );
        return productData;
      }

      // Fallback to the old method if not found in preprocessed data
      logger.debug(
        `Product ${productCode} not found in preprocessed map, falling back to API lookup`
      );

      // Determine the group ID based on the product code
      let groupId: number;
      if (productCode.startsWith("fin-")) {
        groupId = 24219; // FINAL FANTASY group
      } else if (productCode.startsWith("lci-")) {
        groupId = 23312; // The Lost Caverns of Ixalan group
      } else {
        logger.warn(`Unknown product code prefix: ${productCode}`);
        return null;
      }

      // Get the product details
      const allProducts = await this.fetchProducts(groupId);
      const product = allProducts.find((p) => p.productId === productId);

      if (!product) {
        logger.warn(`Product not found in TCGCSV: ${productId}`);
        return null;
      }

      // Get prices for this product
      const prices = await this.getPricesForProducts([productId], groupId);

      return {
        product,
        prices,
      };
    } catch (error) {
      logger.error(`Error getting pricing for product ${productCode}:`, error);
      return null;
    }
  }

  async getProductByTcgplayerId(tcgplayerProductId: string): Promise<{
    product: TCGCSVProduct;
    prices: TCGCSVPrice[];
  } | null> {
    try {
      const productId = parseInt(tcgplayerProductId, 10);
      if (isNaN(productId)) {
        logger.warn(`Invalid TCGPlayer product ID: ${tcgplayerProductId}`);
        return null;
      }

      // We need to search through all groups to find the product
      // This is inefficient but necessary since we don't have a direct lookup
      const magicCategoryId = await this.getMagicCategoryId();
      if (!magicCategoryId) {
        logger.warn("Could not get Magic category ID");
        return null;
      }

      const groups = await this.fetchGroups(magicCategoryId);

      for (const group of groups) {
        const products = await this.fetchProducts(group.groupId);
        const product = products.find((p) => p.productId === productId);

        if (product) {
          // Found the product, get its prices
          const prices = await this.getPricesForProducts(
            [productId],
            group.groupId
          );

          return {
            product,
            prices,
          };
        }
      }

      logger.warn(
        `Product with TCGPlayer ID ${tcgplayerProductId} not found in any Magic group`
      );
      return null;
    } catch (error) {
      logger.error(
        `Error getting product by TCGPlayer ID ${tcgplayerProductId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Build comprehensive product mappings for all sealed products
   * This should be called during server startup after TCGCSV data is preprocessed
   */
  async buildProductMappings(): Promise<void> {
    if (!this.isPreprocessed) {
      logger.warn(
        "TCGCSV data not preprocessed, cannot build product mappings"
      );
      return;
    }

    logger.info("Building comprehensive product mappings...");

    // Don't clear existing mappings initially - we'll merge them
    const originalMappings = new Map(this.productMappings);

    // Get all preprocessed products
    const allProducts = Array.from(this.productIdMap.values());
    logger.info(`Found ${allProducts.length} preprocessed TCGCSV products`);

    // Create a mapping from tcgplayerProductId to TCGCSV prices
    const tcgplayerIdToPricesMap = new Map<
      number,
      { product: TCGCSVProduct; prices: TCGCSVPrice[] }
    >();

    let sealedProductCount = 0;
    for (const { product, prices } of allProducts) {
      if (product.isSealed) {
        sealedProductCount++;
        // Use the product's TCGPlayer ID as the key
        tcgplayerIdToPricesMap.set(product.productId, { product, prices });
      }
    }

    logger.info(
      `Found ${sealedProductCount} sealed TCGCSV products for mapping`
    );

    // Get all extended data products (from sealed_extended_data.json)
    const extendedDataPath = path.join(
      process.cwd(),
      "data",
      "sealed_extended_data.json"
    );
    if (!fs.existsSync(extendedDataPath)) {
      logger.warn(
        "sealed_extended_data.json not found, skipping product mapping"
      );
      return;
    }

    const extendedData = JSON.parse(fs.readFileSync(extendedDataPath, "utf8"));
    logger.info(`Found ${extendedData.length} extended data products to map`);

    let mappedCount = 0;
    let notMappedCount = 0;

    for (const product of extendedData) {
      const productId = parseInt(product.code, 10); // Assuming product.code is the TCGPlayer ID

      if (isNaN(productId)) {
        logger.warn(
          `Skipping extended data product with invalid TCGPlayer ID: ${product.code}`
        );
        notMappedCount++;
        continue;
      }

      // Try to find a matching TCGCSV product by exact TCGPlayer ID
      const tcgcsvProduct = tcgplayerIdToPricesMap.get(productId);

      if (tcgcsvProduct) {
        this.productMappings.set(product.code, tcgcsvProduct.product.productId);
        mappedCount++;
        logger.debug(
          `Mapped: ${product.code} -> ${tcgcsvProduct.product.productId} (${product.name})`
        );
      } else {
        notMappedCount++;
        logger.debug(`No match found for: ${product.code} (${product.name})`);
      }
    }

    // Restore original hardcoded mappings for products that weren't mapped
    for (const [productCode, productId] of originalMappings) {
      if (!this.productMappings.has(productCode)) {
        this.productMappings.set(productCode, productId);
        logger.debug(
          `Restored hardcoded mapping: ${productCode} -> ${productId}`
        );
      }
    }

    logger.info(
      `Product mapping complete: ${mappedCount} exact matches, ${notMappedCount} not mapped`
    );
    logger.info(`Total product mappings: ${this.productMappings.size}`);
  }

  /**
   * Fast lookup for product data using pre-processed map
   */
  getProductByTcgplayerIdFast(tcgplayerProductId: string): {
    product: TCGCSVProduct;
    prices: TCGCSVPrice[];
  } | null {
    if (!this.isPreprocessed) {
      logger.warn("TCGCSV data not pre-processed, falling back to slow lookup");
      return null;
    }

    const productId = parseInt(tcgplayerProductId, 10);
    if (isNaN(productId)) {
      logger.warn(`Invalid TCGPlayer product ID: ${tcgplayerProductId}`);
      return null;
    }

    const result = this.productIdMap.get(productId);
    if (result) {
      logger.debug(`Found product ${productId} in pre-processed map`);
      return result;
    }

    logger.debug(`Product ${productId} not found in pre-processed map`);
    return null;
  }

  /**
   * Get pre-processing statistics
   */
  getPreprocessingStats(): {
    isPreprocessed: boolean;
    totalProducts: number;
    totalPrices: number;
  } {
    let totalPrices = 0;
    for (const entry of this.productIdMap.values()) {
      totalPrices += entry.prices.length;
    }

    return {
      isPreprocessed: this.isPreprocessed,
      totalProducts: this.productIdMap.size,
      totalPrices,
    };
  }

  /**
   * Get all pre-processed TCGCSV products
   */
  getAllProducts(): Array<{
    product: TCGCSVProduct;
    prices: TCGCSVPrice[];
  }> {
    if (!this.isPreprocessed) {
      logger.warn("TCGCSV data not pre-processed, returning empty array");
      return [];
    }

    const products = Array.from(this.productIdMap.values());
    logger.info(`Returning ${products.length} pre-processed TCGCSV products`);
    return products;
  }

  /**
   * Get all product mappings (productCode -> TCGCSV productId)
   */
  getAllProductMappings(): Array<{
    productCode: string;
    tcgcsvProductId: number;
    source: "hardcoded" | "auto-mapped" | "extended-data";
  }> {
    const mappings: Array<{
      productCode: string;
      tcgcsvProductId: number;
      source: "hardcoded" | "auto-mapped" | "extended-data";
    }> = [];

    // Get all mappings from the Map
    for (const [productCode, tcgcsvProductId] of this.productMappings) {
      // Determine the source of this mapping
      let source: "hardcoded" | "auto-mapped" | "extended-data" = "auto-mapped";

      // Check if it's a hardcoded mapping
      if (
        ["fin-collector", "fin-play", "lci-collector", "lci-draft"].includes(
          productCode
        )
      ) {
        source = "hardcoded";
      } else if (this.isPreprocessed) {
        // Check if it exists in the preprocessed data (extended-data mapping)
        const productData = this.productIdMap.get(tcgcsvProductId);
        if (productData) {
          source = "extended-data";
        }
      }

      mappings.push({
        productCode,
        tcgcsvProductId,
        source,
      });
    }

    // Sort by product code for consistent output
    mappings.sort((a, b) => a.productCode.localeCompare(b.productCode));

    logger.info(`Returning ${mappings.length} product mappings`);
    return mappings;
  }

  /**
   * Get the preprocessed product ID map (TCGPlayer Product ID -> Product Data)
   */
  getPreprocessedProductMap(): Array<{
    tcgplayerProductId: number;
    productName: string;
    isSealed: boolean;
    priceCount: number;
    groupId: number;
  }> {
    const productMap: Array<{
      tcgplayerProductId: number;
      productName: string;
      isSealed: boolean;
      priceCount: number;
      groupId: number;
    }> = [];

    for (const [tcgplayerProductId, { product, prices }] of this.productIdMap) {
      productMap.push({
        tcgplayerProductId,
        productName: product.name,
        isSealed: product.isSealed,
        priceCount: prices.length,
        groupId: product.groupId,
      });
    }

    // Sort by TCGPlayer Product ID for consistent output
    productMap.sort((a, b) => a.tcgplayerProductId - b.tcgplayerProductId);

    logger.info(
      `Returning ${productMap.length} preprocessed products (isPreprocessed: ${this.isPreprocessed})`
    );
    return productMap;
  }

  private createDefaultMappings(): void {
    this.setMappings = [
      {
        setCode: "BLO",
        setName: "Bloomburrow",
        groupId: 23874,
        categoryId: 1,
        categoryName: "Magic",
      },
      {
        setCode: "MKM",
        setName: "Murders at Karlov Manor",
        groupId: 23873,
        categoryId: 1,
        categoryName: "Magic",
      },
      {
        setCode: "LCI",
        setName: "Lost Caverns of Ixalan",
        groupId: 23312, // Updated to correct group ID
        categoryId: 1,
        categoryName: "Magic",
      },
      {
        setCode: "WOE",
        setName: "Wilds of Eldraine",
        groupId: 23871,
        categoryId: 1,
        categoryName: "Magic",
      },
      {
        setCode: "LTR",
        setName: "The Lord of the Rings: Tales of Middle-earth",
        groupId: 23870,
        categoryId: 1,
        categoryName: "Magic",
      },
    ];

    this.saveSetMappings();
  }

  private saveSetMappings(): void {
    try {
      const mappingsFile: SetMappingsFile = {
        mappings: this.setMappings,
        lastUpdated: new Date().toISOString(),
        version: "1.0",
      };

      // Ensure directory exists
      const dir = path.dirname(this.mappingsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.mappingsFilePath,
        JSON.stringify(mappingsFile, null, 2)
      );
      logger.info("Saved set mappings to file");
    } catch (error) {
      logger.error("Error saving set mappings:", error);
    }
  }

  getGroupIdForSet(setCode: string): number | null {
    const mapping = this.setMappings.find(
      (m) => m.setCode.toUpperCase() === setCode.toUpperCase()
    );
    return mapping?.groupId || null;
  }

  getAllMappings(): SetMapping[] {
    return this.setMappings;
  }

  setMapping(
    setCode: string,
    setName: string,
    groupId: number,
    categoryId: number,
    categoryName: string
  ): void {
    // Remove existing mapping if it exists
    this.setMappings = this.setMappings.filter(
      (m) => m.setCode.toUpperCase() !== setCode.toUpperCase()
    );

    // Add new mapping
    this.setMappings.push({
      setCode: setCode.toUpperCase(),
      setName,
      groupId,
      categoryId,
      categoryName,
    });

    this.saveSetMappings();
    logger.info(`Added mapping: ${setCode} -> ${groupId}`);
  }

  removeMapping(setCode: string): void {
    this.setMappings = this.setMappings.filter(
      (m) => m.setCode.toUpperCase() !== setCode.toUpperCase()
    );
    this.saveSetMappings();
    logger.info(`Removed mapping for set code: ${setCode}`);
  }

  // MARK: - Pricing Methods
  async getSealedProductsWithPrices(
    setCode: string
  ): Promise<SealedProductWithPrice[]> {
    const groupId = this.getGroupIdForSet(setCode);

    if (!groupId) {
      logger.warn(`No group ID mapping found for set code: ${setCode}`);
      return [];
    }

    // Fetch sealed products
    const sealedProducts = await this.getSealedProducts(groupId);

    // Get product IDs
    const productIds = sealedProducts.map((product) => product.productId);

    // Fetch prices for these products
    const prices = await this.getPricesForProducts(productIds, groupId);

    // Create a dictionary for quick price lookup
    const priceDict = new Map<number, TCGCSVPrice[]>();
    for (const price of prices) {
      if (!priceDict.has(price.productId)) {
        priceDict.set(price.productId, []);
      }
      priceDict.get(price.productId)!.push(price);
    }

    // Combine products with their prices
    const productsWithPrices: SealedProductWithPrice[] = [];

    for (const product of sealedProducts) {
      const productPrices = priceDict.get(product.productId) || [];
      productsWithPrices.push({
        product,
        prices: productPrices,
      });
    }

    return productsWithPrices;
  }

  getBestPrice(product: TCGCSVProduct, prices: TCGCSVPrice[]): number | null {
    const productPrices = prices.filter(
      (p) => p.productId === product.productId
    );

    // Return the best available price (market price, then direct low, then low)
    for (const price of productPrices) {
      if (price.marketPrice && price.marketPrice > 0) {
        return price.marketPrice;
      }
      if (price.directLowPrice && price.directLowPrice > 0) {
        return price.directLowPrice;
      }
      if (price.lowPrice && price.lowPrice > 0) {
        return price.lowPrice;
      }
    }

    return null;
  }

  getPriceStats(
    product: TCGCSVProduct,
    prices: TCGCSVPrice[]
  ): PriceStatistics | null {
    const productPrices = prices.filter(
      (p) => p.productId === product.productId
    );

    if (productPrices.length === 0) {
      return null;
    }

    let lowPrice: number | undefined;
    let midPrice: number | undefined;
    let highPrice: number | undefined;
    let marketPrice: number | undefined;
    let directLowPrice: number | undefined;

    for (const price of productPrices) {
      if (price.lowPrice && price.lowPrice > 0) lowPrice = price.lowPrice;
      if (price.midPrice && price.midPrice > 0) midPrice = price.midPrice;
      if (price.highPrice && price.highPrice > 0) highPrice = price.highPrice;
      if (price.marketPrice && price.marketPrice > 0)
        marketPrice = price.marketPrice;
      if (price.directLowPrice && price.directLowPrice > 0)
        directLowPrice = price.directLowPrice;
    }

    return {
      lowPrice,
      midPrice,
      highPrice,
      marketPrice,
      directLowPrice,
    };
  }

  async findAndMapSet(name: string, setCode: string): Promise<boolean> {
    const magicCategoryId = await this.getMagicCategoryId();

    if (!magicCategoryId) {
      logger.error("Could not find Magic category");
      return false;
    }

    const group = await this.findGroupByName(name, magicCategoryId);

    if (group) {
      this.setMapping(setCode, name, group.groupId, magicCategoryId, "Magic");
      logger.info(
        `Mapped set '${name}' (code: ${setCode}) to group ID: ${group.groupId}`
      );
      return true;
    }

    logger.warn(`Could not find group for set: ${name}`);
    return false;
  }

  async autoDiscoverAndMapSets(): Promise<void> {
    logger.info("Starting automatic set discovery and mapping...");

    const magicCategoryId = await this.getMagicCategoryId();
    if (!magicCategoryId) {
      logger.error("Could not find Magic category");
      return;
    }

    // Get all Magic groups
    const allGroups = await this.fetchGroups(magicCategoryId);
    logger.info(`Found ${allGroups.length} Magic groups to search through`);

    // Get all sets from our data service
    const dataService = new (require("./dataService").MTGDataService)();
    await dataService.initialize();
    const allSets = dataService.getSets();

    logger.info(`Found ${allSets.length} sets in our data to map`);

    let mappedCount = 0;
    let existingCount = 0;

    for (const set of allSets) {
      // Skip if already mapped
      if (this.getGroupIdForSet(set.code)) {
        existingCount++;
        continue;
      }

      // Try to find a matching group
      const matchingGroup = allGroups.find((group) => {
        const groupName = group.name.toLowerCase();
        const setName = set.name.toLowerCase();

        // Exact match
        if (groupName === setName) return true;

        // Contains match
        if (groupName.includes(setName) || setName.includes(groupName))
          return true;

        // Word-based matching
        const groupWords = groupName
          .split(" ")
          .filter((w: string) => w.length > 2);
        const setWords = setName.split(" ").filter((w: string) => w.length > 2);

        if (groupWords.length > 0 && setWords.length > 0) {
          const matchingWords = groupWords.filter((word) =>
            setWords.some(
              (setWord: string) =>
                setWord.includes(word) || word.includes(setWord)
            )
          );

          const matchRatio =
            matchingWords.length / Math.max(groupWords.length, setWords.length);
          return matchRatio >= 0.5;
        }

        return false;
      });

      if (matchingGroup) {
        this.setMapping(
          set.code,
          set.name,
          matchingGroup.groupId,
          magicCategoryId,
          "Magic"
        );
        mappedCount++;
        logger.info(
          `Auto-mapped: ${set.code} (${set.name}) -> ${matchingGroup.groupId} (${matchingGroup.name})`
        );
      } else {
        logger.warn(`No match found for set: ${set.code} (${set.name})`);
      }
    }

    logger.info(
      `Auto-discovery complete: ${mappedCount} new mappings, ${existingCount} already existed`
    );
  }

  /**
   * Pre-process all TCGCSV data into a fast lookup map
   */
  async preprocessAllData(): Promise<void> {
    if (this.isPreprocessed) {
      logger.info("TCGCSV data already pre-processed, skipping");
      return;
    }

    logger.info("Starting TCGCSV data pre-processing...");

    try {
      const magicCategoryId = await this.getMagicCategoryId();
      if (!magicCategoryId) {
        logger.warn("Could not get Magic category ID, skipping pre-processing");
        return;
      }

      const groups = await this.fetchGroups(magicCategoryId);
      logger.info(`Found ${groups.length} Magic groups to process`);

      let totalProducts = 0;
      let totalPrices = 0;

      for (const group of groups) {
        try {
          logger.debug(
            `Processing group: ${group.name} (ID: ${group.groupId})`
          );

          // Fetch products and prices for this group
          const [products, prices] = await Promise.all([
            this.fetchProducts(group.groupId),
            this.fetchPrices(group.groupId),
          ]);

          logger.debug(
            `Found ${products.length} products and ${prices.length} prices in group ${group.name}`
          );

          // Create a map of productId to prices for this group
          const priceMap = new Map<number, TCGCSVPrice[]>();
          for (const price of prices) {
            if (!priceMap.has(price.productId)) {
              priceMap.set(price.productId, []);
            }
            priceMap.get(price.productId)!.push(price);
          }

          // Add each product to the global product map
          for (const product of products) {
            const productPrices = priceMap.get(product.productId) || [];
            if (productPrices.length > 0) {
              this.productIdMap.set(product.productId, {
                product,
                prices: productPrices,
              });
              totalProducts++;
              totalPrices += productPrices.length;
            }
          }
        } catch (error) {
          logger.error(`Error processing group ${group.name}:`, error);
          // Continue with other groups
        }
      }

      this.isPreprocessed = true;
      logger.info(
        `TCGCSV pre-processing complete: ${totalProducts} products mapped with ${totalPrices} total prices`
      );
      logger.info(`Product lookup map size: ${this.productIdMap.size} entries`);

      // Build comprehensive product mappings after data is preprocessed
      await this.buildProductMappings();
    } catch (error) {
      logger.error("Error during TCGCSV pre-processing:", error);
      throw error;
    }
  }
}
