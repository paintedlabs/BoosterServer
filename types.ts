/**
 * types.ts
 *
 * Contains shared TypeScript interfaces and type definitions used across the BoosterServer application,
 * particularly for API request/response structures.
 */

import { CardSet } from './dataLoader'; // Base card data from MTGJSON
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
  allPrintingsData: CardSet;
  scryfallData?: ScryfallTypes.IScryfallCard;
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
