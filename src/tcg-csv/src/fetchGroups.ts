import * as net from '../../core/net/src';
import * as status from '../../core/status/src';
import typia from 'typia';
import * as types from './types';
import * as validation from './validation';
import logger from '../../../logger';

export type FetchGroupsOptions = {
  // The category for which all groups will be fetched.
  //
  // A category represents a specific game scraped by tcgcsv. See `Group` for
  // more details.
  categoryId: number;
};

/**
 * Fetches all groups for a specific game scraped by tcgcsv.
 *
 * @param options - Fetch options.
 *
 * @return A list of groups.
 */
export const fetchGroups = async (
  options: FetchGroupsOptions
): Promise<
  status.StatusOr<
    Array<types.Group>,
    | net.UnknownError
    | net.NoContentError
    | net.UnexpectedStatusError
    | SyntaxError
    | typia.TypeGuardError
    | Error
  >
> => {
  const { categoryId } = options;
  const url = `https://tcgcsv.com/tcgplayer/${categoryId}/groups`;

  const maybeBody = await net.fetchBody(url);
  if (!status.isOk(maybeBody)) {
    return maybeBody;
  }
  const body = maybeBody.value;

  try {
    const groupsResponse = validation.parseGroupsEndpointResponse(body);
    return status.fromValue(groupsResponse.results);
  } catch (e) {
    if (e instanceof typia.TypeGuardError) {
      logger.error(
        { error: e },
        `Typia validation/parse error during fetchGroups for URL: ${url}`
      );
      return status.fromError(e);
    }
    if (e instanceof SyntaxError) {
      logger.error(
        { error: e },
        `JSON Syntax error during fetchGroups for URL: ${url}`
      );
      return status.fromError(e);
    }
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error during fetchGroups';
    const unknownError = new Error(errorMessage);
    logger.error(
      { originalError: e, url },
      `Unexpected error during fetchGroups`
    );
    return status.fromError(unknownError);
  }
};
