/**
 * tcgcsv scrapes and serves pricing data for many different card games. For
 * that reason, its data formats must generalized. They claim that a group
 * roughly translates to a Set in MTG. For our purposes we've observed that to
 * always be true.
 *
 * @see https://tcgcsv.com/#information-tiers
 */
export type Group = {
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
export type GroupsEndpointResponse = {
  success: boolean;
  errors: Array<unknown>;
  results: Array<Group>;
};
