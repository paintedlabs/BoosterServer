import { BoosterSheet } from '../sealed/sealedProductTypes';

export interface ExtendedSealedData {
  uuid: string;
  name: string;
  code: string;
  set_code: string;
  set_name: string;
  category?: string;
  subtype?: string;
  cardCount?: number;
  productSize?: number;
  releaseDate?: string;
  contents?: any;
  identifiers?: any;
  purchaseUrls?: any;
  tcgplayer?: any;
  boosters: ExtendedBooster[];
  sheets: Record<string, BoosterSheet>;
  source_set_codes: string[];
  tcgplayerProductId?: number;
  tcgMarketPrice?: number | null;
}

export interface ExtendedBooster {
  sheets: Record<string, number>;
  weight: number;
}

export interface ExtendedSealedDataFile {
  data: Record<string, ExtendedSealedData>;
  meta: {
    date: string;
    version: string;
  };
}

export interface ExtendedSheetCard {
  uuid: string;
  weight: number;
}

export interface ExtendedSheet {
  totalWeight: number;
  balanceColors: boolean;
  foil: boolean;
  fixed: boolean;
  cards: ExtendedSheetCard[];
}
