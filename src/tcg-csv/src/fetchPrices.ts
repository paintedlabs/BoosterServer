import * as net from '../../core/net/src';
import * as status from '../../core/status/src';
import typia from 'typia';
import * as types from './types';
import * as validation from './validation';
import logger from '../../../logger';

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
    | SyntaxError
    | typia.TypeGuardError
    | Error
  >
> => {
  const { categoryId, groupId } = options;
  const url = `https://tcgcsv.com/tcgplayer/${categoryId}/groups/${groupId}/prices`;

  const maybeBody = await net.fetchBody(url);
  if (!status.isOk(maybeBody)) {
    return maybeBody;
  }
  const body = maybeBody.value;

  try {
    const pricesResponse = validation.parsePricesEndpointResponse(body);
    return status.fromValue(pricesResponse.results);
  } catch (e) {
    if (e instanceof typia.TypeGuardError) {
      logger.error(
        { error: e },
        `Typia validation/parse error during fetchPrices for URL: ${url}`
      );
      return status.fromError(e);
    }
    if (e instanceof SyntaxError) {
      logger.error(
        { error: e },
        `JSON Syntax error during fetchPrices for URL: ${url}`
      );
      return status.fromError(e);
    }
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error during fetchPrices';
    const unknownError = new Error(errorMessage);
    logger.error(
      { originalError: e, url },
      `Unexpected error during fetchPrices`
    );
    return status.fromError(unknownError);
  }
};
