/**
 * graphql/schema.ts
 *
 * Defines the GraphQL schema (type definitions).
 */

// We use gql tag for syntax highlighting and potential future tooling
import gql from 'graphql-tag';

// Type Definitions (Schema)
// We'll map our existing data structures to GraphQL types.
export const typeDefs = gql`
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
    # We might not expose scryfallId directly in GraphQL
    # identifiers: ??? # Could be a JSON String or a nested type
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

  # Type for card prices
  type Prices {
    usd: String
    usd_foil: String
    usd_etched: String
    eur: String
    eur_foil: String
    tix: String
  }

  # Represents a single card within an opened pack
  type OpenedCard {
    sheet: String!
    allPrintingsData: AllPrintingsCard!
    scryfallData: ScryfallCard
  }

  # Response type for opening a SINGLE pack
  type OpenedPackResponse {
    warning: String
    pack: [OpenedCard!]
  }

  # Response type for opening MULTIPLE packs
  type OpenedPacksResponse {
    warning: String
    packs: [OpenedCard!] # Correct: Flat array of all opened cards
  }

  # Represents a specific product available for opening
  type Product {
    code: String!
    name: String!
    set_code: String!
    set_name: String!
    boosters: [BoosterV2!] # Expose booster configurations
    sheets: [SheetV2!] # Expose sheet details
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

    # Potentially add queries for specific cards later if needed
    # card(uuid: String!): CombinedCard # Needs a CombinedCard type
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

// Note: We might need to install graphql-tag if not already present
// npm install graphql-tag
