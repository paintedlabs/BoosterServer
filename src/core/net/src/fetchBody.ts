import * as status from '@core/status';

import * as errors from './errors';
import { Response as FetchResponse } from 'node-fetch';

// Explicitly import node-fetch v2 using require for CommonJS compatibility
const fetch = require('node-fetch');

/**
 * Using the same signature as `fetch`, makes the network request and returns
 * the response's body as text (decoded using the content-encoding header).
 *
 * Given that this method is used to fetch the response body, it makes two
 * assumptions:
 * 1. Non-200 responses are failures
 * 2. Responses with no body (such as HEAD requests) are failures.
 *
 * @param input – A definition of the resource to fetch.
 * @param init - An object containing options to configure the request.
 *
 * @return The response's body.
 */
export const fetchBody = (input: RequestInfo | URL, init?: RequestInit) =>
  genericFetchBody({ input, init, reader: (response) => response.text() });

/**
 * Using the same signature as `fetch`, makes the network request and returns
 * the response's body as bytes.
 *
 * Given that this method is used to fetch the response body, it makes two
 * assumptions:
 * 1. Non-200 responses are failures
 * 2. Responses with no body (such as HEAD requests) are failures.
 *
 * @param input – A definition of the resource to fetch.
 * @param init - An object containing options to configure the request.
 *
 * @return The response's body.
 *
 * @see `fetchBody` which decodes the body as text using the `content-encoding`
 *   header.
 */
export const fetchBodyAsBytes = (
  input: RequestInfo | URL,
  init?: RequestInit
) =>
  genericFetchBody({
    input,
    init,
    reader: (response) => response.arrayBuffer(),
  });

const genericFetchBody = async <T>(args: {
  input: RequestInfo | URL;
  init?: RequestInit;
  reader: (response: FetchResponse) => Promise<T>;
}): Promise<
  status.StatusOr<
    T,
    errors.NoContentError | errors.UnexpectedStatusError | errors.UnknownError
  >
> => {
  const { input, init, reader } = args;

  const maybeResponse = await status.tryCatchAsync(
    () => fetch(input, init) as Promise<FetchResponse>,
    (error: unknown) => status.fromError(errors.createUnknownError(error))
  );
  if (!status.isOk(maybeResponse)) {
    return maybeResponse;
  }
  const response = maybeResponse.value;

  if (response.status !== 200) {
    return status.fromError(
      errors.createUnexpectedStatusError({
        expected: 200,
        observed: response.status,
      })
    );
  }

  if (response.body == null) {
    return status.fromError(errors.createNoContentError());
  }

  return await status.tryCatchAsync(
    () => reader(response),
    (error: unknown) => status.fromError(errors.createUnknownError(error))
  );
};
