import { IScryfallObject } from "./IScryfallObject";

/**
 * A Catalog object contains an array of Magic datapoints (words, card values, etc). Catalog objects are provided by the
 * API as aids for building other Magic software and understanding possible values for a field on Card objects.
 *
 * @see https://scryfall.com/docs/api/catalogs
 */
export interface IScryfallCatalog extends IScryfallObject {
  /**
   * @inheritDoc
   */
  object: "catalog";

  /**
   * A link to the current catalog on Scryfall’s API.
   */
  uri: string;

  /**
   * The number of items in the `data` array.
   */
  total_values: number;

  /**
   * An array of datapoints.
   */
  data: string[];
}
