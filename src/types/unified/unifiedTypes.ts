// Unified type definitions that combine data from MTGJson, Scryfall, TCGPlayer, and MTG.WTF

// Base types used across the unified model
export interface PriceInfo {
  lowPrice: number;
  midPrice: number;
  highPrice: number;
  marketPrice: number;
  directLowPrice: number;
}

export interface ImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
  art_crop: string;
  border_crop: string;
}

export interface Identifiers {
  // MTGJson identifiers
  mtgjsonV4Id: string;
  mtgjsonFoilVersionId: string;
  mtgjsonNonFoilVersionId: string;

  // Scryfall identifiers
  scryfallId: string;
  scryfallOracleId: string;
  scryfallIllustrationId: string;
  scryfallCardBackId: string;

  // TCGPlayer identifiers
  tcgplayerProductId: string;
  tcgplayerEtchedProductId: string;

  // Other marketplace identifiers
  cardKingdomId: string;
  cardKingdomFoilId: string;
  cardKingdomEtchedId: string;
  cardsphereId: string;
  cardsphereFoilId: string;
  cardtraderId: string;
  mcmId: string;
  mcmMetaId: string;
  mtgoId: string;
  mtgoFoilId: string;
  multiverseId: string;
}

export interface PurchaseUrls {
  cardKingdom: string;
  cardKingdomFoil: string;
  cardKingdomEtched: string;
  cardmarket: string;
  tcgplayer: string;
  tcgplayerEtched: string;
}

export interface Legalities {
  standard: string;
  future: string;
  historic: string;
  gladiator: string;
  pioneer: string;
  explorer: string;
  modern: string;
  legacy: string;
  pauper: string;
  vintage: string;
  penny: string;
  commander: string;
  oathbreaker: string;
  brawl: string;
  historicbrawl: string;
  alchemy: string;
  paupercommander: string;
  duel: string;
  oldschool: string;
  premodern: string;
  predh: string;
}

export interface LeadershipSkills {
  brawl: boolean;
  commander: boolean;
  oathbreaker: boolean;
}

export interface TCGPlayerData {
  product_id: number;
  prices: {
    normal: PriceInfo;
    foil: PriceInfo;
  };
  image_url: string;
  clean_name: string;
  extended_data: Array<{
    name: string;
    displayName: string;
    value: string;
  }>;
  market_price?: number;
}

// Core card type that combines all sources
export interface UnifiedCard {
  // Core MTGJson fields
  uuid: string;
  name: string;
  asciiName: string;
  setCode: string;
  number: string;
  layout: string;
  type: string;
  types: string[];
  subtypes: string[];
  supertypes: string[];
  text: string;
  flavorText: string;
  artist: string;
  artistIds: string[];
  borderColor: string;
  frameVersion: string;
  frameEffects: string[];
  language: string;
  rarity: string;
  cardParts: string[];
  finishes: string[];
  identifiers: Identifiers;
  purchaseUrls: PurchaseUrls;
  legalities: Legalities;
  leadershipSkills: LeadershipSkills;

  // Card characteristics
  colors: string[];
  colorIdentity: string[];
  colorIndicator: string[];
  manaCost: string;
  convertedManaCost: number;
  manaValue: number;
  power: string;
  toughness: string;
  defense: string;
  loyalty: string;
  life: string;
  hand: string;

  // Card properties
  hasFoil: boolean;
  hasNonFoil: boolean;
  isAlternative: boolean;
  isFullArt: boolean;
  isFunny: boolean;
  isOnlineOnly: boolean;
  isOversized: boolean;
  isPromo: boolean;
  isRebalanced: boolean;
  isReprint: boolean;
  isReserved: boolean;
  isStarter: boolean;
  isStorySpotlight: boolean;
  isTextless: boolean;
  isTimeshifted: boolean;
  hasAlternativeDeckLimit: boolean;
  hasContentWarning: boolean;

  // Scryfall additions
  scryfallData?: {
    id: string;
    card_faces?: Array<{
      id: string;
      image_uris?: ImageUris;
    }>;
    image_uris?: ImageUris;
  };
  image_uris: ImageUris;
  foil_types: string[];
  keywords: string[];
  oracle_text: string;
  type_line: string;
  released_at: string;
  highres_image: boolean;
  image_status: string;

  // TCGPlayer additions
  tcgplayer: TCGPlayerData;
}

// Booster configuration types
export interface BoosterSheet {
  totalWeight: number;
  balanceColors: boolean;
  foil: boolean;
  fixed: boolean;
  cards: Array<{
    uuid: string;
    weight: number;
  }>;
}

export interface BoosterConfig {
  boosters: Array<{
    weight: number;
    contents: Array<{
      sheet: string;
      count: number;
    }>;
  }>;
  boostersTotalWeight: number;
  name: string;
  sheets: Record<string, BoosterSheet>;
}

// Sealed product types
export interface SealedProductCard {
  foil: boolean;
  name: string;
  number: string;
  set: string;
  uuid: string;
}

export interface SealedProductContents {
  card: SealedProductCard[];
  deck: Array<{
    name: string;
    set: string;
  }>;
  other: Array<{
    name: string;
  }>;
  pack: Array<{
    code: string;
    set: string;
  }>;
  sealed: Array<{
    count: number;
    name: string;
    set: string;
    uuid: string;
  }>;
  variable: Array<{
    configs: SealedProductContents[];
  }>;
}

export interface UnifiedSealedProduct {
  // MTGJson base fields
  uuid: string;
  code: string;
  name: string;
  setCode: string;
  category?: string;
  subtype?: string;
  cardCount?: number;
  productSize?: number;
  releaseDate?: string;
  contents?: UnifiedSealedProductContents;
  identifiers: Identifiers;
  purchaseUrls: PurchaseUrls;
  booster?: BoosterConfig;

  // TCGPlayer additions
  tcgplayer: TCGPlayerData;
}

// Set type
export interface UnifiedSet {
  // MTGJson base fields
  baseSetSize: number;
  block: string;
  booster: Record<string, BoosterConfig>; // Changed to Record<string, BoosterConfig> for multiple booster types
  cards: UnifiedCard[];
  cardsphereSetId: number;
  code: string;
  codeV3: string;
  isForeignOnly: boolean;
  isFoilOnly: boolean;
  isNonFoilOnly: boolean;
  isOnlineOnly: boolean;
  isPaperOnly: boolean;
  isPartialPreview: boolean;
  keyruneCode: string;
  languages: string[];
  mcmId: number;
  mcmIdExtras: number;
  mcmName: string;
  mtgoCode: string;
  name: string;
  parentCode: string;
  releaseDate: string;
  sealedProduct: UnifiedSealedProduct[];
  tcgplayerGroupId: number;
  tokens: UnifiedCard[];
  tokenSetCode: string;
  totalSetSize: number;
  translations: Record<string, string>; // Changed to Record for better structure
  type: string;
}

// Overall data structure for AllPrintings.json (and similar combined data)
export interface UnifiedData {
  meta: {
    version: string;
    date: string;
  };
  data: Record<string, UnifiedSet>;
}

// Specific types for Booster Configuration, ensuring Unified naming
export interface UnifiedBoosterPack {
  weight: number;
  contents: {
    sheet: string;
    count: number;
  }[];
}

export interface UnifiedBoosterConfig {
  boosters: UnifiedBoosterPack[];
  sheets: Record<
    string,
    {
      totalWeight: number;
      balanceColors: boolean;
      foil: boolean;
      fixed: boolean;
      cards: {
        uuid: string;
        weight: number;
      }[];
    }
  >;
}

// Specific types for Sealed Product contents, ensuring Unified naming
export interface UnifiedSealedProductCard {
  foil: boolean;
  name: string;
  number: string;
  set: string;
  uuid: string;
}

export interface UnifiedSealedProductContents {
  card?: UnifiedSealedProductCard[];
  deck?: Array<{
    name: string;
    set: string;
  }>;
  other?: Array<{
    name: string;
  }>;
  pack?: Array<{
    code: string;
    set: string;
  }>;
  sealed?: Array<{
    count: number;
    name: string;
    set: string;
    uuid: string;
  }>;
  variable?: Array<{
    configs: UnifiedSealedProductContents[];
  }>;
}
