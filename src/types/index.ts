import * as ScryfallTypes from "./scryfall";

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
}

export interface PackCard {
  sheet: string;
  allPrintingsData: CardSet;
  scryfallData?: ScryfallTypes.IScryfallCard;
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
  openProduct(productCode: string): PackResponse;
  openMultipleProducts(
    productCode: string,
    count: number
  ): MultiplePacksResponse;
}

export interface ImageService {
  getCardImage(allPrintingsId: string, cardFace: string): Promise<string>;
  getSetImage(setCode: string): string;
  ensureSetImagesCached(): Promise<void>;
}
