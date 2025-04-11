import * as net from '@core/net';
import * as status from '@core/status';
import * as typiaExtensions from '@extensions/typia';

import * as types from './types';
import * as validation from './validation';

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
    | typiaExtensions.JsonParseError
    | typiaExtensions.ValidationError
  >
> => {
  const { categoryId } = options;

  const maybeBody = await net.fetchBody(
    `https://tcgcsv.com/tcgplayer/${categoryId}/groups`
  );
  if (!status.isOk(maybeBody)) {
    return maybeBody;
  }
  const body = maybeBody.value;

  try {
    const groupsResponse = validation.parseGroupsEndpointResponse(body);
    return status.fromValue(groupsResponse.results);
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
