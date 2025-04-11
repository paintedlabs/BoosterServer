/**
 * Products can be sealed boxes, packs, or individual cards.
 */
export type Product = {
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
export type ProductsEndpointResponse = {
  success: boolean;
  errors: Array<unknown>;
  results: Array<Product>;
};
