/**
 * types.ts
 *
 * Contains shared TypeScript interfaces and type definitions used across the BoosterServer application,
 * particularly for API request/response structures.
 */

import { CardSet, CombinedCard } from './dataLoader'; // Base card data from MTGJSON and CombinedCard
import * as ScryfallTypes from './index'; // Scryfall card type definitions

// Response structure for the GET /sets endpoint
export interface SetResponse {
  code: string;
  name: string;
  releaseDate: string;
}

// Represents a single card within an opened pack response
export interface OpenedCard {
  sheet: string;
  card: CombinedCard; // Use the CombinedCard type directly
  // Removed allPrintingsData and scryfallData
  // allPrintingsData: CardSet;
  // scryfallData?: ScryfallTypes.IScryfallCard;
}

// Interface for the response when opening a single pack
export interface OpenedPackResponse {
  warning: string | null;
  pack: OpenedCard[];
}

// Interface for the response when opening MULTIPLE packs
export interface OpenedPacksResponse {
  warning: string | null;
  packs: OpenedCard[]; // Flat array of all cards opened
}

// Response structure for the POST /products/:productCode/open endpoint
export interface MultiplePacksResponse {
  packs: OpenedPackResponse[];
}

// TCG CSV Types - based on https://tcgcsv.com/#information-tiers and observed structure

/**
 * tcgcsv scrapes and serves pricing data for many different card games. For
 * that reason, its data formats must generalized. They claim that a group
 * roughly translates to a Set in MTG. For our purposes we've observed that to
 * always be true.
 *
 * @see https://tcgcsv.com/#information-tiers
 */
export type TcgCsvGroup = {
  // The name of the set.
  name: string;

  // The set code.
  abbreviation: string;

  // The groupId is an identifier internal to tcgcsv and is used to align set
  // information with prices and products.
  groupId: number;

  // The categoryId is an identifier internal to tcgcsv and is used align sets
  // with a specific game such as Magic or YuGiOh.
  categoryId: number;

  // An ISO-formatted date string.
  modifiedOn: string;

  // An ISO-formatted date string.
  publishedOn: string;
};

/**
 * The /{categoryId}/groups endpoint returns all groups for a given category in
 * the following format.
 */
export type TcgCsvGroupsEndpointResponse = {
  success: boolean;
  errors: Array<unknown>;
  results: Array<TcgCsvGroup>;
};

/**
 * Products can be sealed boxes, packs, or individual cards.
 */
export type TcgCsvProduct = {
  // The name of the product.
  //
  // It's unclear why it's a "clean" name, but seeing as tcgcsv scrapes most of
  // their data I imagine this has been stripped of whitespace for example.
  cleanName: string;

  // The name of the product.
  //
  // Unlike `cleanName`, presumably may have artifacts from scraping. Prefer
  // `cleanName`.
  name: string;

  // A unique ID for the product which is used to align other tcgcsv.com data
  // such as prices to products.
  productId: number;

  // The groupId is an identifier internal to tcgcsv and roughly represents a
  // MTG Set. See `Group` for more details.
  groupId: number;

  // The categoryId is an identifier internal to tcgcsv and is used to represent
  // a specific game such as Magic or YuGiOh.
  categoryId: number;

  imageUrl: string;

  // tcgplayer.com URL for the product.
  url: string;

  // An ISO-formatted date string.
  modifiedOn: string;
};

/**
 * The /{categoryId}/{groupId}/products endpoint returns all products for a
 * given group in the following format.
 */
export type TcgCsvProductsEndpointResponse = {
  success: boolean;
  errors: Array<unknown>;
  results: Array<TcgCsvProduct>;
};

/**
 * Represents price information for a single product.
 */
export type TcgCsvPrice = {
  // The product this price applies to.
  //
  // See `Product`.
  productId: number;

  marketPrice?: number | null;

  // Indicates the price (if available) of tcgdirect.
  directLowPrice?: number | null;

  lowPrice?: number | null;
  midPrice?: number | null;
  highPrice?: number | null;

  subTypeName: TcgCsvPriceSubType;
};

export type TcgCsvPriceSubType = 'Normal' | 'Foil';

/**
 * The /{categoryId}/{groupId}/prices endpoint returns all prices for products
 * in a given group in the following format.
 */
export type TcgCsvPricesEndpointResponse = {
  success: boolean;
  errors: Array<unknown>;
  results: Array<TcgCsvPrice>;
};
