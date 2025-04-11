import * as status from '@core/status';
import * as typesafety from '@core/typesafety';

import type * as duration from './duration';

import * as sleep from './sleep';

/**
 * Executes the provided callback and if no result is returned by the provided
 * duration, aborts the callback and returns a timeout error.
 *
 * This is typically used to enforce constraints on a long-running task. For
 * example:
 *
 * ```ts
 * const maybeSocket = await doWithTimeout({
 *   callback: () => connectSocket(),
 *   timeout: { seconds: 5 },
 * });
 * ```
 *
 * @param args -
 * @param args.callback - The callback to execute.
 * @param args.timeout - The duration to wait before canceling the callback.
 *
 * @returns The result of your callback, or an error if it timed out.
 */
export const doWithTimeout = async <R>(args: {
  callback: (abortSignal: AbortSignal) => typesafety.AsyncOrSync<R>;
  timeout: duration.Duration;
}): Promise<status.StatusOr<R, TimeoutError>> => {
  const { callback, timeout } = args;

  const sleepAbortController = new AbortController();
  const callbackAbortController = new AbortController();

  const COMPLETED_TIMER: unique symbol = Symbol();
  const waitUntilTimeout = async (): Promise<typeof COMPLETED_TIMER> => {
    await sleep.sleep(timeout, { abortSignal: sleepAbortController.signal });
    return COMPLETED_TIMER;
  };

  const result = await Promise.race([
    waitUntilTimeout(),
    callback(callbackAbortController.signal),
  ]);

  if (result === COMPLETED_TIMER) {
    callbackAbortController.abort();
    return status.fromError(createTimeoutError({ timeout }));
  }

  sleepAbortController.abort();
  return status.fromValue(result);
};

export const TIMEOUT_ERROR_TYPE = Symbol('TimeoutError');

export type TimeoutErrorType = typeof TIMEOUT_ERROR_TYPE;

export type TimeoutError = {
  type: TimeoutErrorType;

  timeout: duration.Duration;
};

export const createTimeoutError = (
  details: Omit<TimeoutError, 'type'>,
): TimeoutError => ({
  type: TIMEOUT_ERROR_TYPE,
  ...details,
});
