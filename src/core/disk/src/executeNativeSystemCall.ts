import * as status from '@core/status';
import * as typesafety from '@core/typesafety';

import * as errors from './errors';

/**
 * Executes the provided callback and catches any errors, automatically
 * identifying common File IO errors which are returned as a `SystemError`.
 *
 * @param callback - The callback to execute. This is expected to be a call to
 *   node's `fs` module.
 *
 * @returns The callback's response or an error if one occured.
 */
export const executeNativeSystemCall = <R>(
  callback: () => typesafety.AsyncOrSync<R>,
): Promise<status.StatusOr<R, errors.SystemError | errors.UnknownError>> =>
  status.tryCatchAsync(
    async () => callback(),
    (error) => status.fromError(interpretNativeError(error)),
  );

const interpretNativeError = (
  error: unknown,
): errors.SystemError | errors.UnknownError => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    const code = Object.values(errors.SystemErrorCode).find(
      (value) => value === error.code,
    );
    if (code != null) {
      return errors.createSystemError({ code });
    }
  }

  return errors.createUnknownError(error);
};
