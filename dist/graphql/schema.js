"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
/**
 * graphql/schema.ts
 *
 * Defines the GraphQL schema (type definitions).
 */
// We use gql tag for syntax highlighting and potential future tooling
const graphql_tag_1 = __importDefault(require("graphql-tag"));
// Type Definitions (Schema)
// We'll map our existing data structures to GraphQL types.
exports.typeDefs = (0, graphql_tag_1.default) `
  # Represents basic information about an MTG Set
  type Set {
    code: String!
    name: String!
    releaseDate: String!
    # Add other set fields if needed, e.g., releaseDate: String
  }

  # Represents basic card info from MTGJSON AllPrintings
  type AllPrintingsCard {
    uuid: String!
    name: String!
    rarity: String!
    identifiers: Identifiers # Nested type for identifiers
  }

  # Nested type for identifiers
  type Identifiers {
    scryfallId: String
    tcgplayerProductId: String
    # Add other identifier fields if needed
  }

  # Represents a face of a double-faced card
  type CardFace {
    object: String!
    name: String!
    mana_cost: String
    type_line: String!
    oracle_text: String
    colors: [String!]
    color_identity: [String!]
    power: String
    toughness: String
    flavor_text: String
    artist: String
    artist_id: String
    illustration_id: String
    image_uris: ImageUris
  }

  # Represents Scryfall card data (simplified for now)
  type ScryfallCard {
    id: String! # Scryfall ID
    oracle_id: String
    name: String!
    lang: String
    released_at: String
    uri: String
    scryfall_uri: String
    layout: String
    mana_cost: String
    cmc: Float
    type_line: String!
    oracle_text: String
    colors: [String!]
    color_identity: [String!]
    keywords: [String!]
    legalities: String # JSON string containing format legality
    games: [String!]
    reserved: Boolean
    foil: Boolean
    nonfoil: Boolean
    finishes: [String!]
    oversized: Boolean
    promo: Boolean
    reprint: Boolean
    variation: Boolean
    set_id: String
    set: String!
    set_name: String!
    set_type: String
    set_uri: String
    set_search_uri: String
    scryfall_set_uri: String
    rulings_uri: String
    prints_search_uri: String
    collector_number: String!
    digital: Boolean
    rarity: String!
    flavor_text: String
    card_back_id: String
    artist: String
    artist_ids: [String!]
    illustration_id: String
    border_color: String
    frame: String
    full_art: Boolean
    textless: Boolean
    booster: Boolean
    story_spotlight: Boolean
    edhrec_rank: Int
    penny_rank: Int
    prices: Prices
    related_uris: String # JSON string containing related cards
    purchase_uris: String # JSON string containing purchase links
    card_faces: [CardFace!]
    image_uris: ImageUris
    promo_types: [String!]
    tcgplayer_id: String
    all_parts: [RelatedCard!] # For tokens and related cards
  }

  # Type for related cards (tokens, etc.)
  type RelatedCard {
    object: String!
    id: String!
    component: String!
    name: String!
    type_line: String!
    uri: String!
  }

  # Type for image URIs
  type ImageUris {
    small: String
    normal: String
    large: String
    png: String
    art_crop: String
    border_crop: String
  }

  # Type for card prices from Scryfall
  type Prices {
    usd: String
    usd_foil: String
    usd_etched: String
    eur: String
    eur_foil: String
    tix: String
  }

  # Represents the combined internal card data structure
  type CombinedCard {
    allPrintingsData: AllPrintingsCard! # Keep basic print data
    scryfallData: ScryfallCard # Keep detailed Scryfall data
    # Add our fetched TCG CSV prices
    tcgNormalMarketPrice: Float # Nullable Float
    tcgFoilMarketPrice: Float # Nullable Float
  }

  # Represents a single card within an opened pack
  type OpenedCard {
    sheet: String!
    # Use the CombinedCard type to represent the card
    card: CombinedCard! # Expose the full combined data
    # Removed allPrintingsData and scryfallData as they are nested in card
  }

  # Response type for opening a SINGLE pack
  type OpenedPackResponse {
    warning: String
    pack: [OpenedCard!]
  }

  # Response type for opening MULTIPLE packs
  type OpenedPacksResponse {
    warning: String
    packs: [OpenedCard!] # Flat array of all opened cards
  }

  # Represents a specific product available for opening
  type Product {
    code: String!
    name: String!
    set_code: String!
    set_name: String!
    boosters: [BoosterV2!] # Expose booster configurations
    sheets: [SheetV2!] # Expose sheet details
    tcgMarketPrice: Float # Add our fetched market price (nullable Float)
  }

  # Represents the structure of a booster pack configuration (based on BoosterV2 type)
  type BoosterV2 {
    contents: [BoosterContentEntry!]! # Key-value map of sheet names to counts
    totalWeight: Int!
  }

  # Helper type for the key-value pairs in BoosterV2.contents
  type BoosterContentEntry {
    sheetName: String!
    count: Int!
  }

  # Represents the structure of a printing sheet (based on SheetV2 type)
  type SheetV2 {
    name: String! # The name of the sheet (derived from the key)
    balanceColors: Boolean!
    cards: [SheetCardEntry!]! # Key-value map of card UUIDs to weights
    foil: Boolean!
    totalWeight: Int!
  }

  # Helper type for the key-value pairs in SheetV2.cards
  type SheetCardEntry {
    uuid: String! # Card UUID from AllPrintings
    weight: Int! # Weight/frequency of the card on this sheet
  }

  # --- Root Query Type ---
  # Defines the available read operations
  type Query {
    # Get a list of all available sets that have products
    sets: [Set!]!

    # Get a list of products for a given set code
    products(setCode: String!): [Product!]!

    # Get details for a specific product (optional, could just use products query)
    product(productCode: String!): Product

    # Add query for combined card data by UUID
    card(uuid: String!): CombinedCard
  }

  # --- Root Mutation Type ---
  # Defines the available write/action operations
  type Mutation {
    # Open a single booster pack for a given product code
    openPack(productCode: String!): OpenedPackResponse

    # Open multiple booster packs for a given product code
    openPacks(productCode: String!, number: Int!): OpenedPacksResponse
  }
`;
