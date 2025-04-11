import * as net from '@core/net';
import * as status from '@core/status';
import * as typiaExtensions from '@extensions/typia';

import * as types from './types';
import * as validation from './validation';

export type FetchPricesOptions = {
  // The category for which all prices will be fetched.
  //
  // A category represents a specific game scraped by tcgcsv. See `Group` for
  // more details.
  categoryId: number;

  // The group for which all prices will be fetched.
  //
  // A group roughly translates to a Set in MTG. See `Group` for more details.
  groupId: number;
};

/**
 * Fetches all prices for a specific group scraped by tcgcsv.
 *
 * @param options - Fetch options.
 *
 * @return A list of prices.
 */
export const fetchPrices = async (
  options: FetchPricesOptions
): Promise<
  status.StatusOr<
    Array<types.Price>,
    | net.UnknownError
    | net.NoContentError
    | net.UnexpectedStatusError
    | typiaExtensions.JsonParseError
    | typiaExtensions.ValidationError
  >
> => {
  const { categoryId, groupId } = options;

  const maybeBody = await net.fetchBody(
    `https://tcgcsv.com/tcgplayer/${categoryId}/groups/${groupId}/prices`
  );
  if (!status.isOk(maybeBody)) {
    return maybeBody;
  }
  const body = maybeBody.value;

  try {
    const pricesResponse = validation.parsePricesEndpointResponse(body);
    return status.fromValue(pricesResponse.results);
  } catch (e) {
    if (
      e instanceof typiaExtensions.JsonParseError ||
      e instanceof typiaExtensions.ValidationError
    ) {
      return status.fromError(e);
    }
    throw e;
  }
};
