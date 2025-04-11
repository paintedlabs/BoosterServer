import * as statusOr from './StatusOr';

/**
 * Given an `ErrorStatusOr`, returns a copy with a rewritten "error" field,
 * preserving all other properties (e.g. `traceback` and `retriable`).
 *
 * This is useful when clients need to transform the shape or content of an
 * error without altering its intrinsic attributes.
 *
 * @param errorStatusOr - The `ErrorStatusOr` which will be mapped.
 * @param mapper - A function which transforms the original `error` field.
 *
 * @returns A new `ErrorStatusOr` with a rewritten "error" field.
 */
export const rewriteError = <E_IN, E_OUT>(
  errorStatusOr: statusOr.ErrorStatusOr<E_IN>,
  mapper: (error: E_IN) => E_OUT,
): statusOr.ErrorStatusOr<E_OUT> => ({
  __typename: errorStatusOr.__typename,
  error: mapper(errorStatusOr.error),
  retriable: errorStatusOr.retriable,
  changelog: [
    ...errorStatusOr.changelog,
    {
      type: statusOr.ChangeEventType.REWRITE,
      rewrittenError: errorStatusOr.error,
    },
  ],

  // `ErrorStatusOr.traceback` is lazily evaluated for performance, so it's
  // critical that we maintain lazy evaluation when copying the error.
  get traceback() {
    return errorStatusOr.traceback;
  },
});

export const rewriteIfError = <T, E_IN, E_OUT>(
  status: statusOr.StatusOr<T, E_IN>,
  mapper: (error: E_IN) => E_OUT,
): statusOr.StatusOr<T, E_OUT> => {
  if (statusOr.isOk(status)) {
    return status;
  }

  return rewriteError(status, mapper);
};
