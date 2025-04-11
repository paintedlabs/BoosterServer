import * as duration from './duration';

export type SleepOptions = {
  abortSignal?: AbortSignal;
};

export type SleepResult = {
  cancelled: boolean;
};

/**
 * Returns a promise which resolves after the provided duration has passed.
 *
 * Useful for replicating `sleep`-like behavior in async methods like so:
 *
 * ```ts
 * await sleep({ seconds: 0.5 });
 * ```
 *
 * @param delay - The delay to wait for.
 * @param options - Sleep options.
 *
 * @returns A promise which will resolve after `delay`.
 */
export const sleep = (
  delay: duration.Duration,
  options?: SleepOptions,
): Promise<SleepResult> => {
  if (options?.abortSignal?.aborted) {
    return Promise.resolve({ cancelled: true });
  }

  const delayMs = duration.toMilliseconds(delay);
  if (delayMs <= 0) {
    return Promise.resolve({ cancelled: false });
  }

  return new Promise((resolve) => {
    const onAbort = () => {
      resolve({ cancelled: true });
      clearTimeout(timeout);
    };

    if (options?.abortSignal != null) {
      options.abortSignal.addEventListener('abort', onAbort);
    }

    const timeout = setTimeout(() => {
      options?.abortSignal?.removeEventListener('abort', onAbort);
      resolve({ cancelled: false });
    }, delayMs);
  });
};

/**
 * Returns a promise which resolves on or after the provided date.
 *
 * Useful for replicating `sleep`-like behaviors in async methods like so.
 *
 * ```ts
 * await sleepUntil(futureDate);
 * ```
 *
 * @param date - The date to sleep until.
 * @param options - Sleep options.
 *
 * @returns A promise which will resolve on or after `date`.
 */
export const sleepUntil = (
  date: Date,
  options?: SleepOptions,
): Promise<SleepResult> =>
  sleep({ milliseconds: Date.now() - date.getTime() }, options);
