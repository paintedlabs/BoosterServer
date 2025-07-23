// TCGCSV API Types
import { PackCard } from "./index";

// Category Response
export interface TCGCSVCategoryResponse {
  totalItems: number;
  success: boolean;
  errors: string[];
  results: TCGCSVCategory[];
}

// Category
export interface TCGCSVCategory {
  categoryId: number;
  name: string;
  modifiedOn: string;
  displayName: string;
  seoCategoryName: string;
  categoryDescription: string;
  categoryPageTitle: string;
  sealedLabel: string;
  nonSealedLabel?: string;
  conditionGuideUrl: string;
  isScannable: boolean;
  popularity: number;
  isDirect: boolean;
}

// Group Response
export interface TCGCSVGroupResponse {
  totalItems: number;
  success: boolean;
  errors: string[];
  results: TCGCSVGroup[];
}

// Group
export interface TCGCSVGroup {
  groupId: number;
  name: string;
  modifiedOn: string;
  abbreviation?: string;
  publishedOn?: string;
  categoryId: number;
  isSupplemental: boolean;
  isHidden: boolean;
  displayName?: string;
  seoGroupName?: string;
  groupDescription?: string;
  groupPageTitle?: string;
  sealedLabel?: string;
  nonSealedLabel?: string;
  conditionGuideUrl?: string;
  isScannable: boolean;
  popularity: number;
  isDirect: boolean;
}

// Product Response
export interface TCGCSVProductResponse {
  totalItems: number;
  success: boolean;
  errors: string[];
  results: TCGCSVProduct[];
}

// Product
export interface TCGCSVProduct {
  productId: number;
  name: string;
  modifiedOn: string;
  groupId: number;
  categoryId: number;
  imageUrl?: string;
  extendedData?: TCGCSVExtendedData[];
  isSealed: boolean;
  isDirect: boolean;
}

// Extended Data
export interface TCGCSVExtendedData {
  name: string;
  value: string;
}

// Price Response
export interface TCGCSVPriceResponse {
  totalItems: number;
  success: boolean;
  errors: string[];
  results: TCGCSVPrice[];
}

// Price
export interface TCGCSVPrice {
  priceId: number;
  productId: number;
  subTypeName: string;
  marketPrice?: number;
  lowPrice?: number;
  midPrice?: number;
  highPrice?: number;
  directLowPrice?: number;
  updatedOn: string;
}

// Set Mapping
export interface SetMapping {
  setCode: string;
  setName: string;
  groupId: number;
  categoryId: number;
  categoryName: string;
}

// Set Mappings File
export interface SetMappingsFile {
  mappings: SetMapping[];
  lastUpdated: string;
  version: string;
}

// Combined sealed product with pricing
export interface SealedProductWithPrice {
  product: TCGCSVProduct;
  prices: TCGCSVPrice[];
}

// Price statistics
export interface PriceStatistics {
  lowPrice?: number | undefined;
  midPrice?: number | undefined;
  highPrice?: number | undefined;
  marketPrice?: number | undefined;
  directLowPrice?: number | undefined;
}

// Enhanced pack response with pricing
export interface PackResponseWithPricing {
  pack: PackCard[];
  pricing?: {
    productId?: number;
    priceStats?: PriceStatistics;
    lastUpdated?: string;
  };
  warning?: string;
}
