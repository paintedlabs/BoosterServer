import * as statusOrModule from './StatusOr';

// `Status` is a specialization of `StatusOr` with no assignable value. It's
// useful in cases where a method wants to return a Status but has no return
// value on success.
export const OK_VALUE = 'Status{THIS_MUST_BE_UNIQUE_AND_SERIALIZABLE}';

export type Status<E = string> = statusOrModule.StatusOr<typeof OK_VALUE, E>;

export const okStatus = (): statusOrModule.OkStatusOr<typeof OK_VALUE> =>
  statusOrModule.fromValue(OK_VALUE);

export const stripValue = <T, E>(
  statusOr: statusOrModule.StatusOr<T, E>,
): Status<E> => {
  if (statusOrModule.isOk(statusOr)) {
    return okStatus();
  }

  return statusOr;
};

/**
 * Allows clients to graft a value onto an "OK" `Status`. If the provided status
 * is not "OK", the error will be copied as the relevant `StatusOr<T>`.
 *
 * @param status The status maybe receiving a new value.
 * @param value The value to graft.
 *
 * @returns `StatusOr<T>` the grafted StatusOr.
 */
export const graftValue = <T, E>(
  status: Status<E>,
  value: T,
): statusOrModule.StatusOr<T, E> => {
  if (!statusOrModule.isOk(status)) {
    return status;
  }

  return statusOrModule.fromValue(value);
};
