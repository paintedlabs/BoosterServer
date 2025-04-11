import {
  SealedProduct as MtgjsonSealedProduct,
  SealedProductContents,
  Identifiers,
  PurchaseUrls,
} from './mtgjsonTypes';
import { TcgCsvProduct } from './tcgCsvTypes';

/**
 * Represents a comprehensive sealed product that combines data from:
 * - MTGJSON (AllPrintings.json)
 * - Extended Sealed Data (sealed_extended_data.json)
 * - TCGPlayer CSV data
 */
export interface SealedProduct {
  // Basic identification
  uuid: string;
  name: string;
  code: string;
  setCode: string;
  setName: string;

  // Product details
  category?: string;
  subtype?: string | null;
  cardCount?: number;
  productSize?: number;
  releaseDate?: string;

  // Source data
  sourceSetCodes: string[];
  contents?: SealedProductContents;

  // Booster configuration
  boosters?: {
    name?: string;
    sheets: Record<string, BoosterSheet>;
  };

  // Identifiers and purchase URLs
  identifiers: Identifiers;
  purchaseUrls: PurchaseUrls;

  // TCGPlayer data
  tcgplayerProductId?: number;
  tcgMarketPrice?: number | null;

  // Additional metadata
  isFoilOnly?: boolean;
  isNonFoilOnly?: boolean;
  isOnlineOnly?: boolean;
  isPaperOnly?: boolean;
  isPartialPreview?: boolean;
}

export interface BoosterSheet {
  totalWeight: number;
  balanceColors?: boolean;
  foil: boolean;
  fixed?: boolean;
  cards: Array<{
    uuid: string;
    weight: number;
  }>;
}

/**
 * Helper function to create a SealedProduct from MTGJSON data
 */
export function fromMtgjson(
  product: MtgjsonSealedProduct
): Partial<SealedProduct> {
  return {
    uuid: product.uuid,
    name: product.name,
    category: product.category,
    cardCount: product.cardCount,
    productSize: product.productSize,
    releaseDate: product.releaseDate,
    subtype: product.subtype,
    contents: product.contents,
    identifiers: product.identifiers,
    purchaseUrls: product.purchaseUrls,
  };
}

/**
 * Helper function to create a SealedProduct from Extended Sealed Data
 */
export function fromExtendedData(product: {
  name: string;
  code: string;
  set_code: string;
  set_name: string;
  boosters: Array<{
    name?: string;
    sheets: Record<string, BoosterSheet>;
  }>;
  source_set_codes: string[];
  tcgplayerProductId?: number;
  tcgMarketPrice?: number | null;
}): Partial<SealedProduct> {
  return {
    name: product.name,
    code: product.code,
    setCode: product.set_code,
    setName: product.set_name,
    sourceSetCodes: product.source_set_codes,
    boosters: product.boosters[0],
    tcgplayerProductId: product.tcgplayerProductId,
    tcgMarketPrice: product.tcgMarketPrice,
  };
}

/**
 * Helper function to create a SealedProduct from TCGPlayer CSV data
 */
export function fromTcgCsv(product: TcgCsvProduct): Partial<SealedProduct> {
  return {
    tcgplayerProductId: product.productId,
    name: product.name,
    identifiers: {
      tcgplayerProductId: product.productId.toString(),
    },
  };
}

/**
 * Combines data from multiple sources into a single SealedProduct
 */
export function combineSealedProduct(
  mtgjson: Partial<SealedProduct>,
  extended: Partial<SealedProduct>,
  tcgCsv: Partial<SealedProduct>
): SealedProduct {
  return {
    // Basic identification (prefer extended data for these fields)
    uuid: mtgjson.uuid || '',
    name: extended.name || mtgjson.name || tcgCsv.name || '',
    code: extended.code || '',
    setCode: extended.setCode || '',
    setName: extended.setName || '',

    // Product details (prefer MTGJSON data)
    category: mtgjson.category,
    subtype: mtgjson.subtype,
    cardCount: mtgjson.cardCount,
    productSize: mtgjson.productSize,
    releaseDate: mtgjson.releaseDate,

    // Source data (from extended data)
    sourceSetCodes: extended.sourceSetCodes || [],
    contents: mtgjson.contents,

    // Booster configuration (from extended data)
    boosters: extended.boosters,

    // Identifiers and purchase URLs (merge from all sources)
    identifiers: {
      ...mtgjson.identifiers,
      ...tcgCsv.identifiers,
    },
    purchaseUrls: {
      ...mtgjson.purchaseUrls,
      ...tcgCsv.purchaseUrls,
    },

    // TCGPlayer data (from TCG CSV)
    tcgplayerProductId: tcgCsv.tcgplayerProductId,
    tcgMarketPrice: tcgCsv.tcgMarketPrice,

    // Additional metadata (from MTGJSON)
    isFoilOnly: mtgjson.isFoilOnly,
    isNonFoilOnly: mtgjson.isNonFoilOnly,
    isOnlineOnly: mtgjson.isOnlineOnly,
    isPaperOnly: mtgjson.isPaperOnly,
    isPartialPreview: mtgjson.isPartialPreview,
  };
}
