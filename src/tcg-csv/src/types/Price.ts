/**
 * Represents price information for a single product.
 */
export type Price = {
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

  subTypeName: PriceSubType;
};

export type PriceSubType = 'Normal' | 'Foil';

/**
 * The /{categoryId}/{groupId}/prices endpoint returns all prices for products
 * in a given group in the following format.
 */
export type PricesEndpointResponse = {
  success: boolean;
  errors: Array<unknown>;
  results: Array<Price>;
};
