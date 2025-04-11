import * as status from '@core/status';
import * as typesafety from '@core/typesafety';

import * as duration from './duration';
import * as sleep from './sleep';

export type RetryOptions = {
  // The maximum amount of times to retry a failed operation.
  //
  // Defaults to Infinity.
  maxRetries?: number;

  // The exponential factor used for backoff.
  //
  // Defaults to 2.
  factor?: number;

  // The base used for exponential backoff.
  //
  // Defaults to 1s.
  base?: duration.Duration;

  // The maximum timeout between retries.
  //
  // Defaults to Infinity.
  maxTimeout?: duration.Duration;
};

/**
 * Executes the provided operation and retries failures.
 *
 * Uses exponential backoff with full jitter as out lined here:
 * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @param operation - The operation to execute.
 * @param options - Retry options.
 *
 * @returns The operation response. It may be an error if `maxRetries` has been
 *   hit and the last recorded operation execution was an error.
 */
export const doWithRetry = async <T, E>(
  operation: () => typesafety.AsyncOrSync<status.StatusOr<T, E>>,
  options?: RetryOptions,
): Promise<status.StatusOr<T, E>> => {
  const optionsWithDefaults: Required<RetryOptions> = {
    maxRetries: Infinity,
    factor: 2,
    base: { milliseconds: 1000 },
    maxTimeout: { milliseconds: Infinity },
    ...options,
  };

  let operationResult: status.StatusOr<T, E> = await operation();
  let retries = 0;

  while (
    !status.isOk(operationResult) &&
    retries < optionsWithDefaults.maxRetries
  ) {
    await delay(retries++, optionsWithDefaults);
    operationResult = await operation();
  }

  return operationResult;
};

/**
 * Executes the provided operation until it responds with a successful status.
 *
 * Uses exponential backoff with full jitter as outlined here:
 * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @param operation - The operation to execute.
 * @param options - Retry options.
 *
 * @returns The successful operation response.
 */
export const retryUntilSuccessful = async <T, E>(
  operation: () => typesafety.AsyncOrSync<status.StatusOr<T, E>>,
  options?: Omit<RetryOptions, 'maxRetries'>,
): Promise<T> =>
  // This "throwIfError" should NEVER throw an error because maxRetries is set
  // to Infinity. We're using it here to forceably unwrap the StatusOr.
  status.throwIfError(
    await doWithRetry(operation, {
      maxRetries: Infinity,
      ...options,
    }),
  );

/**
 * Given a number of retries and retry options, returns a promise which will
 * resolve after exponential backoff has been applied between the last retry and
 * the next.
 *
 * Uses exponential backoff with full jitter as out lined here:
 * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @param retries - The number of retries already attempted.
 * @param options - Retry options.
 *
 * @returns A promise which will resolve after backoff has been applied.
 */
const delay = async (
  retries: number,
  options: Required<RetryOptions>,
): Promise<void> => {
  const exponentialBackoff =
    duration.toMilliseconds(options.base) * Math.pow(options.factor, retries);
  const withCap = Math.min(
    duration.toMilliseconds(options.maxTimeout),
    exponentialBackoff,
  );
  const withFullJitter = Math.random() * withCap;

  await sleep.sleep({ milliseconds: withFullJitter });
};
