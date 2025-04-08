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
    name: String!
    oracle_text: String
    image_uris: ImageUris
  }

  # Represents Scryfall card data (simplified for now)
  # We'll need to select which fields from IScryfallCard to expose
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
    type_line: String
    oracle_text: String
    colors: [String!] # Represent colors as strings for simplicity
    color_identity: [String!]
    keywords: [String!]
    legalities: String # Use JSON String for complex nested objects initially
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
    prices: Prices # Now uses the structured Prices type
    related_uris: String # Use JSON String
    purchase_uris: String # Use JSON String
    card_faces: [CardFace!] # Array of card faces for double-faced cards
    image_uris: ImageUris # Nested type for images
    promo_types: [String!]
    tcgplayer_id: String
  }

  # Represents image URIs available for a Scryfall card
  type ImageUris {
    small: String
    normal: String
    large: String
    png: String
    art_crop: String
    border_crop: String
  }

  # Type definition for Scryfall card prices
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
    sheet: String! # The sheet the card was pulled from
    allPrintingsData: AllPrintingsCard! # MTGJSON data
    scryfallData: ScryfallCard # Scryfall data (nullable if missing)
    imageUrl: String # Direct URL to the cached image (if needed)
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
    # We might not expose boosters/sheets directly,
    # just the ability to open the product.
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
