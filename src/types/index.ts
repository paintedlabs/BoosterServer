import * as ScryfallTypes from "./scryfall";
import { PackResponseWithPricing, TCGCSVProduct, TCGCSVPrice } from "./tcgcsv";

// Re-export for convenience
export { PackResponseWithPricing } from "./tcgcsv";

// MTGJson Types
export interface AllPrintings {
  meta: Meta;
  data: Record<string, MTGSet>;
}

export interface Meta {
  version: string;
  date: string;
}

export interface MTGSet {
  baseSetSize: number;
  code: string;
  name: string;
  releaseDate: string;
  cards: CardSet[];
  sealedProduct?: AllPrintingsSealedProduct[];
}

export interface AllPrintingsSealedProduct {
  uuid: string;
  name: string;
  category: string;
  cardCount?: number;
  contents?: {
    pack?: Array<{ code: string; set: string }>;
    sealed?: Array<{ count: number; name: string; set: string; uuid: string }>;
    card?: Array<{
      foil?: boolean;
      name: string;
      number: string;
      set: string;
      uuid: string;
    }>;
    other?: Array<{ name: string }>;
  };
  identifiers?: {
    abuId?: string;
    cardKingdomId?: string;
    cardtraderId?: string;
    csiId?: string;
    mcmId?: string;
    scgId?: string;
    tcgplayerProductId?: string;
    tntId?: string;
  };
  purchaseUrls?: {
    cardKingdom?: string;
    tcgplayer?: string;
    cardmarket?: string;
  };
  releaseDate?: string;
  subtype?: string;
}

export interface CardSet {
  uuid: string;
  name: string;
  rarity: string;
  identifiers?: {
    scryfallId?: string;
    [key: string]: any;
  };
}

// Extended Sealed Data Types
export interface ExtendedSealedData {
  name: string;
  code: string;
  set_code: string;
  set_name: string;
  boosters: ExtendedBooster[];
  sheets: Record<string, ExtendedSheet>;
  source_set_codes: string[];
}

export interface ExtendedBooster {
  sheets: Record<string, number>;
  weight: number;
}

export interface ExtendedSheet {
  total_weight: number;
  cards: ExtendedSheetCard[];
}

export interface ExtendedSheetCard {
  set: string;
  number: string;
  weight: number;
  foil?: boolean;
  uuid: string;
}

// API Response Types
export interface SetResponse {
  code: string;
  name: string;
}

export interface CombinedCard {
  allPrintingsData: CardSet;
  scryfallData?: ScryfallTypes.IScryfallCard;
  tcgcsvData?: {
    product: TCGCSVProduct;
    prices: TCGCSVPrice[];
  };
}

export interface PackCard {
  sheet: string;
  allPrintingsData: CardSet;
  scryfallData?: ScryfallTypes.IScryfallCard;
  tcgcsvData?: {
    product: TCGCSVProduct;
    prices: TCGCSVPrice[];
  };
}

export interface PackResponse {
  pack: PackCard[];
  warning?: string;
}

export interface MultiplePacksResponse {
  packs: PackResponse[];
}

// Error Types
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

// Service Types
export interface DataService {
  getAllPrintings(): AllPrintings | null;
  getExtendedData(): ExtendedSealedData[];
  getCombinedCards(): Record<string, CombinedCard>;
  getSets(): SetResponse[];
  getProducts(setCode: string): ExtendedSealedData[];
  getProductsWithAllData(setCode: string): Promise<
    Array<
      ExtendedSealedData & {
        tcgcsvData?: {
          product: TCGCSVProduct;
          prices: TCGCSVPrice[];
        };
      }
    >
  >;
  getProductsWithCompleteData(setCode: string): Promise<
    Array<
      ExtendedSealedData & {
        tcgcsvData?: {
          product: TCGCSVProduct;
          prices: TCGCSVPrice[];
        };
        allPrintingsData?: AllPrintingsSealedProduct[];
      }
    >
  >;

  // New methods for AllPrintings-prioritized sealed products
  getCombinedSealedProducts(setCode: string): CombinedSealedProduct[];
  getCombinedSealedProductByUuid(uuid: string): CombinedSealedProduct | null;
  openCombinedSealedProduct(uuid: string): PackResponse;
  openCombinedSealedProductWithPricing(
    uuid: string
  ): Promise<PackResponseWithPricing>;

  openProduct(productCode: string): PackResponse;
  openMultipleProducts(
    productCode: string,
    count: number
  ): MultiplePacksResponse;
  openProductWithPricing(productCode: string): Promise<PackResponseWithPricing>;
  openProductWithCardPricing(productCode: string): Promise<PackResponse>;
  openMultipleProductsWithCardPricing(
    productCode: string,
    count: number
  ): Promise<MultiplePacksResponse>;
  getCardWithTCGCSV(cardUuid: string): Promise<CombinedCard | null>;
  getTCGCSVStats(): {
    preprocessedProducts: number;
    totalCards: number;
    cardsWithTCGPlayerId: number;
    cardsWithTCGCSVData: number;
  };
  getTCGCSVProducts(): Array<{
    product: TCGCSVProduct;
    prices: TCGCSVPrice[];
  }>;
  getSetInfo(setCode: string): any | null;
  getEnhancedProducts(setCode: string): any[];
  getPreprocessedSetCodes(): string[];
  getSetMappingStats(): {
    totalSets: number;
    totalEnhancedProducts: number;
    setsWithMtgJsonData: number;
    setsWithTcgcsvMapping: number;
  };
}

export interface ImageService {
  getCardImage(allPrintingsId: string, cardFace: string): Promise<string>;
  getSetImage(setCode: string): string;
  ensureSetImagesCached(): Promise<void>;
}

// TCGCSV Service Interface
export interface TCGCSVServiceInterface {
  fetchCategories(): Promise<any[]>;
  fetchGroups(categoryId: number): Promise<any[]>;
  fetchProducts(groupId: number): Promise<any[]>;
  fetchPrices(groupId: number): Promise<any[]>;
  getMagicCategoryId(): Promise<number | null>;
  getPokemonCategoryId(): Promise<number | null>;
  findGroupByName(name: string, categoryId: number): Promise<any | null>;
  getSealedProducts(groupId: number): Promise<any[]>;
  getPricesForProducts(productIds: number[], groupId: number): Promise<any[]>;
  getGroupIdForSet(setCode: string): number | null;
  getAllMappings(): any[];
  setMapping(
    setCode: string,
    setName: string,
    groupId: number,
    categoryId: number,
    categoryName: string
  ): void;
  removeMapping(setCode: string): void;
  getSealedProductsWithPrices(setCode: string): Promise<any[]>;
  getBestPrice(product: any, prices: any[]): number | null;
  getPriceStats(product: any, prices: any[]): any | null;
  findAndMapSet(name: string, setCode: string): Promise<boolean>;
  preprocessAllData(): Promise<void>;
  getProductByTcgplayerIdFast(tcgplayerProductId: string): any | null;
  getPreprocessingStats(): {
    isPreprocessed: boolean;
    totalProducts: number;
    totalPrices: number;
  };
  getAllProducts(): Array<{
    product: TCGCSVProduct;
    prices: TCGCSVPrice[];
  }>;
  getAllProductMappings(): Array<{
    productCode: string;
    tcgcsvProductId: number;
    source: "hardcoded" | "auto-mapped" | "extended-data";
  }>;
  getPreprocessedProductMap(): Array<{
    tcgplayerProductId: number;
    productName: string;
    isSealed: boolean;
    priceCount: number;
    groupId: number;
  }>;
}

// New combined sealed product type that prioritizes AllPrintings
export interface CombinedSealedProduct {
  // Primary data from AllPrintings
  uuid: string;
  name: string;
  category: string;
  cardCount?: number;
  releaseDate?: string;
  subtype?: string;
  identifiers?: {
    abuId?: string;
    cardKingdomId?: string;
    cardtraderId?: string;
    csiId?: string;
    mcmId?: string;
    scgId?: string;
    tcgplayerProductId?: string;
    tntId?: string;
  };
  purchaseUrls?: {
    cardKingdom?: string;
    tcgplayer?: string;
    cardmarket?: string;
  };
  contents?: {
    pack?: Array<{ code: string; set: string }>;
    sealed?: Array<{ count: number; name: string; set: string; uuid: string }>;
    card?: Array<{
      foil?: boolean;
      name: string;
      number: string;
      set: string;
      uuid: string;
    }>;
    other?: Array<{ name: string }>;
  };

  // Set information
  setCode: string;
  setName: string;

  // Extended data (if available) for pack generation
  extendedData?: {
    code: string;
    boosters: ExtendedBooster[];
    sheets: Record<string, ExtendedSheet>;
    source_set_codes: string[];
  };

  // TCGCSV data (if available)
  tcgcsvData?: {
    product: TCGCSVProduct;
    prices: TCGCSVPrice[];
  };
}
