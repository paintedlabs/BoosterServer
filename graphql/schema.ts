/**
 * graphql/schema.ts
 *
 * Defines the GraphQL schema (type definitions) using our unified data model.
 */

// We use gql tag for syntax highlighting and potential future tooling
import gql from 'graphql-tag';

// Type Definitions (Schema)
// We'll map our existing data structures to GraphQL types.
export const typeDefs = gql`
  # Base types
  type PriceInfo {
    lowPrice: Float!
    midPrice: Float!
    highPrice: Float!
    marketPrice: Float!
    directLowPrice: Float!
  }

  type ImageUris {
    small: String
    normal: String
    large: String
    png: String
    art_crop: String
    border_crop: String
  }

  type Identifiers {
    # MTGJson identifiers
    mtgjsonV4Id: String
    mtgjsonFoilVersionId: String
    mtgjsonNonFoilVersionId: String

    # Scryfall identifiers
    scryfallId: String
    scryfallOracleId: String
    scryfallIllustrationId: String
    scryfallCardBackId: String

    # TCGPlayer identifiers
    tcgplayerProductId: String
    tcgplayerEtchedProductId: String

    # Other marketplace identifiers
    cardKingdomId: String
    cardKingdomFoilId: String
    cardKingdomEtchedId: String
    cardsphereId: String
    cardsphereFoilId: String
    cardtraderId: String
    mcmId: String
    mcmMetaId: String
    mtgoId: String
    mtgoFoilId: String
    multiverseId: String
  }

  type PurchaseUrls {
    cardKingdom: String
    cardKingdomFoil: String
    cardKingdomEtched: String
    cardmarket: String
    tcgplayer: String
    tcgplayerEtched: String
  }

  type Legalities {
    standard: String
    future: String
    historic: String
    gladiator: String
    pioneer: String
    explorer: String
    modern: String
    legacy: String
    pauper: String
    vintage: String
    penny: String
    commander: String
    oathbreaker: String
    brawl: String
    historicbrawl: String
    alchemy: String
    paupercommander: String
    duel: String
    oldschool: String
    premodern: String
    predh: String
  }

  type LeadershipSkills {
    brawl: Boolean!
    commander: Boolean!
    oathbreaker: Boolean!
  }

  type TCGPlayerData {
    product_id: Int
    prices: TcgPlayerPrices
    image_url: String
    clean_name: String
    extended_data: [TcgPlayerExtendedData!]
    market_price: Float
  }

  # Core card type
  type Card {
    # Core MTGJson fields
    uuid: String!
    name: String!
    asciiName: String
    setCode: String!
    number: String!
    layout: String!
    type: String!
    types: [String!]!
    subtypes: [String!]!
    supertypes: [String!]!
    text: String
    flavorText: String
    artist: String
    artistIds: [String!]
    borderColor: String!
    frameVersion: String!
    frameEffects: [String!]
    language: String!
    rarity: String!
    cardParts: [String!]
    finishes: [String!]!
    identifiers: Identifiers!
    purchaseUrls: PurchaseUrls!
    legalities: Legalities!
    leadershipSkills: LeadershipSkills

    # Card characteristics
    colors: [String!]!
    colorIdentity: [String!]!
    colorIndicator: [String!]
    manaCost: String
    convertedManaCost: Float!
    manaValue: Float!
    power: String
    toughness: String
    defense: String
    loyalty: String
    life: String
    hand: String

    # Card properties
    hasFoil: Boolean!
    hasNonFoil: Boolean
    isAlternative: Boolean
    isFullArt: Boolean
    isFunny: Boolean
    isOnlineOnly: Boolean
    isOversized: Boolean
    isPromo: Boolean
    isRebalanced: Boolean
    isReprint: Boolean
    isReserved: Boolean
    isStarter: Boolean
    isStorySpotlight: Boolean
    isTextless: Boolean
    isTimeshifted: Boolean
    hasAlternativeDeckLimit: Boolean
    hasContentWarning: Boolean

    # Scryfall additions
    image_uris: ImageUris
    foil_types: [String!]
    foil: Boolean
    keywords: [String!]
    oracle_text: String
    type_line: String
    released_at: String
    highres_image: Boolean
    image_status: String

    # TCGPlayer additions
    tcgplayer: TCGPlayerData
    tcgplayer_product_id: Int
    tcgplayer_prices: TcgPlayerPrices
    tcgplayer_image_url: String
    tcgplayer_clean_name: String
    tcgplayer_extended_data: [TcgPlayerExtendedData!]
  }

  type TcgPlayerPrices {
    normal: PriceInfo
    foil: PriceInfo
    etched: PriceInfo
  }

  type TcgPlayerExtendedData {
    name: String!
    displayName: String!
    value: String!
  }

  # Booster configuration types
  type BoosterSheet {
    totalWeight: Int!
    balanceColors: Boolean!
    foil: Boolean!
    fixed: Boolean!
    cards: [BoosterSheetCard!]!
  }

  type BoosterSheetCard {
    uuid: String!
    weight: Int!
  }

  type BoosterConfig {
    boosters: [BoosterEntry!]!
    boostersTotalWeight: Int!
    name: String!
    sheets: [BoosterSheet!]!
  }

  type BoosterEntry {
    weight: Int!
    contents: [BoosterContent!]!
  }

  type BoosterContent {
    sheet: String!
    count: Int!
  }

  # Sealed product types
  type SealedProductContents {
    card: [SealedProductCard!]
    deck: [SealedProductDeck!]
    other: [SealedProductOther!]
    pack: [SealedProductPack!]
    sealed: [SealedProductSealed!]
    variable: [SealedProductVariable!]
  }

  type SealedProductCard {
    foil: Boolean!
    name: String!
    number: String!
    set: String!
    uuid: String!
  }

  type SealedProductDeck {
    name: String!
    set: String!
  }

  type SealedProductOther {
    name: String!
  }

  type SealedProductPack {
    code: String!
    set: String!
  }

  type SealedProductSealed {
    count: Int!
    name: String!
    set: String!
    uuid: String!
  }

  type SealedProductVariable {
    configs: [SealedProductContents!]!
  }

  # Sealed product type
  type SealedProduct {
    # MTGJson base fields
    uuid: String!
    name: String!
    category: String!
    subtype: String!
    cardCount: Int!
    productSize: Int!
    releaseDate: String!
    contents: SealedProductContents!
    identifiers: Identifiers!
    purchaseUrls: PurchaseUrls!
    booster: BoosterConfig

    # TCGPlayer additions
    tcgplayer: TCGPlayerData
    tcgMarketPrice: Float
    tcgplayerProductId: Int
  }

  # Set type
  type Set {
    # MTGJson base fields
    baseSetSize: Int!
    block: String
    booster: [BoosterConfig!]!
    cards: [Card!]!
    cardsphereSetId: Int
    code: String!
    codeV3: String
    isForeignOnly: Boolean!
    isFoilOnly: Boolean!
    isNonFoilOnly: Boolean!
    isOnlineOnly: Boolean!
    isPaperOnly: Boolean!
    isPartialPreview: Boolean!
    keyruneCode: String!
    languages: [String!]!
    mcmId: Int
    mcmIdExtras: Int
    mcmName: String
    mtgoCode: String
    name: String!
    parentCode: String
    releaseDate: String!
    sealedProduct: [SealedProduct!]!
    tcgplayerGroupId: Int
    tokens: [Card!]!
    tokenSetCode: String
    totalSetSize: Int!
    translations: [String!]!
    type: String!
  }

  # Opened pack types
  type OpenedCard {
    sheet: String!
    card: Card!
  }

  type OpenedPackResponse {
    warning: String
    pack: [OpenedCard!]!
  }

  type OpenedPacksResponse {
    warning: String
    packs: [OpenedCard!]!
  }

  # Root Query type
  type Query {
    # Get all sets
    sets: [Set!]!

    # Get a specific set by code
    set(code: String!): Set

    # Get all sealed products
    sealedProducts: [SealedProduct!]!

    # Get a specific sealed product by code
    sealedProduct(code: String!): SealedProduct

    # Get all sealed products for a specific set
    sealedProductsForSet(code: String!): [SealedProduct!]!

    # Get a specific card by UUID
    card(uuid: String!): Card
  }

  # Root Mutation type
  type Mutation {
    # Open a single pack
    openPack(productCode: String!): OpenedPackResponse!

    # Open multiple packs
    openPacks(productCode: String!, number: Int!): OpenedPacksResponse!
  }
`;
