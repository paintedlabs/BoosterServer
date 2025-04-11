export type Error = UnknownError | NoContentError | UnexpectedStatusError;

export enum ErrorType {
  UNKNOWN = 'UNKNOWN',
  NO_CONTENT = 'NO_CONTENT',
  UNEXPECTED_STATUS = 'UNEXPECTED_STATUS',
}

export type UnknownError = {
  type: ErrorType.UNKNOWN;

  // An unknown error is typically picked up by a try-catch and as a result
  // contains unsafe types. For debugging purposes those types are stored here.
  internalDebugContext?: {
    message: string;
    stack?: string;
    cause?: unknown;
    raw: unknown;
  };
};

export const createUnknownError = (
  internalDebugContext: unknown
): UnknownError => ({
  type: ErrorType.UNKNOWN,
  internalDebugContext: {
    message:
      internalDebugContext instanceof Error
        ? internalDebugContext.message
        : String(internalDebugContext),
    stack:
      internalDebugContext instanceof Error
        ? internalDebugContext.stack
        : undefined,
    raw: internalDebugContext,
  },
});

/**
 * Represents the case where a response body was expected, but none was found.
 */
export type NoContentError = {
  type: ErrorType.NO_CONTENT;
};

export const createNoContentError = (): NoContentError => ({
  type: ErrorType.NO_CONTENT,
});

/**
 * Represents the case where an HTTP status mismatched the desired status.
 */
export type UnexpectedStatusError = {
  type: ErrorType.UNEXPECTED_STATUS;

  expected: number;
  observed: number;
};

export const createUnexpectedStatusError = (
  details: Omit<UnexpectedStatusError, 'type'>
): UnexpectedStatusError => ({
  type: ErrorType.UNEXPECTED_STATUS,
  ...details,
});
