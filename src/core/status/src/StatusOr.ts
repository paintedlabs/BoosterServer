export type StatusOr<T, E = string> = OkStatusOr<T> | ErrorStatusOr<E>;

export type OkStatusOr<T> = {
  __typename: typeof STATUS_OR_IDENTIFIER;
  value: T;
};

export type ErrorStatusOr<E> = {
  __typename: typeof STATUS_OR_IDENTIFIER;

  // Contains domain-specific error details. Defined by consumers to match
  // their error taxonomy.
  error: E;

  // Signals whether transient failures might resolve with retries. Critical for
  // implementing intelligent retry logic in distributed systems.
  retriable: boolean;

  // Audit trail of error transformations. Maintains original error context when
  // errors are wrapped/replaced during bubbling, preserving debugging
  // information that would otherwise be lost in abstraction layers.
  changelog: Array<ChangeEvent>;

  // The stacktrace of this error.
  //
  // Note that this field is lazily evaluated and that accessing it will incur a
  // performance penalty.
  traceback?: string;
};

export type ChangeEvent = RewriteChangeEvent;

export enum ChangeEventType {
  REWRITE = 'REWRITE',
}

/**
 * Documents an error replacement event. Captures the original error value
 * before transformation to help developers trace error origins through
 * abstraction layers.
 *
 * @see ./rewriteError.ts
 */
export type RewriteChangeEvent = {
  type: ChangeEventType.REWRITE;

  rewrittenError: unknown;
};

export const isStatusOr = (
  thing: unknown,
): thing is StatusOr<unknown, unknown> =>
  typeof thing === 'object' &&
  thing != null &&
  '__typename' in thing &&
  thing.__typename === STATUS_OR_IDENTIFIER;

export const isOk = <T, E>(
  statusOr: StatusOr<T, E>,
): statusOr is OkStatusOr<T> => 'value' in statusOr;

export const fromValue = <T>(value: T): OkStatusOr<T> => ({
  __typename: STATUS_OR_IDENTIFIER,
  value,
});

export type FromErrorOptions = {
  retriable?: boolean;
};

export const fromError = <E>(
  error: E,
  options?: FromErrorOptions,
): ErrorStatusOr<E> => {
  const optionsWithDefaults: Required<FromErrorOptions> = {
    retriable: false,
    ...(options ?? {}),
  };

  const tracebackGetter = createLazyTracebackGetter(fromError);

  return {
    __typename: STATUS_OR_IDENTIFIER,
    error,
    retriable: optionsWithDefaults.retriable,
    changelog: [],
    get traceback() {
      return tracebackGetter();
    },
  };
};

/**
 * This function returns a getter which will provide a traceback from the time
 * the getter was created.
 *
 * Many JS runtimes optimize errors by deferring expensive traceback operations
 * until a traceback is actually accessed. Therefore it's critical for
 * performance in `ErrorStatusOr` that we do not access a traceback until it's
 * required.
 *
 * @param before - The acquired traceback will only contain stack frames from
 *   before the provided method was called. This is useful to ensure that traces
 *   do not contain internal error creation helpers such as `fromError`.
 *
 * @returns A lazy getter for the traceback.
 *
 * @see https://developer.chrome.com/blog/faster-stack-traces/
 */
const createLazyTracebackGetter = (
  // Typically we don't permit raw `Function` types, but in this case it's
  // desired to match the call signature of `Error.captureStackTrace`.
  //
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  before?: Function,
): (() => string | undefined) => {
  if (Error.captureStackTrace == null) {
    const error = new Error();
    return () => error.stack;
  }

  const reader: { stack?: string } = {};
  Error.captureStackTrace(reader, before ?? createLazyTracebackGetter);
  return () => reader.stack;
};

// For most typeguards we'd just check if the unknown type has the same shape as
// our target type. However, `StatusOr` has very common structure (literally
// just the field `value`). To more clearly distinguish it from other unknown
// types we add this identifier to all StatusOr instances.
const STATUS_OR_IDENTIFIER = '@core/status#StatusOr';
