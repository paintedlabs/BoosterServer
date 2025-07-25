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
}
