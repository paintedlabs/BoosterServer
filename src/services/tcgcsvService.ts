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
  private mappingsFilePath: string;

  constructor() {
    this.mappingsFilePath = path.join(
      process.cwd(),
      "data",
      "setMappings.json"
    );
    this.loadSetMappings();
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

  async getPokemonCategoryId(): Promise<number | null> {
    if (this.categories.length === 0) {
      await this.fetchCategories();
    }

    const pokemonCategory = this.categories.find(
      (cat) => cat.name === "Pokemon"
    );
    return pokemonCategory?.categoryId || null;
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
        logger.info(`Loaded ${this.setMappings.length} set mappings from file`);
      } else {
        logger.warn("Set mappings file not found, creating default mappings");
        this.createDefaultMappings();
      }
    } catch (error) {
      logger.error("Error loading set mappings:", error);
      this.createDefaultMappings();
    }
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
        groupId: 23872,
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
}
