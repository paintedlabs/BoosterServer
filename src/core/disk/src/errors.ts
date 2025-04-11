export type Error = SystemError | UnknownError;

export enum ErrorType {
  UNKNOWN = 'UNKNOWN',
  SYSTEM = 'SYSTEM',
}

export type UnknownError = {
  type: ErrorType.UNKNOWN;

  // An unknown error is typically picked up by a try-catch and as a result
  // contains unsafe types. For debugging purposes those types are stored here.
  internalDebugContext?: unknown;
};

export const createUnknownError = (
  internalDebugContext: unknown,
): UnknownError => ({
  type: ErrorType.UNKNOWN,
  internalDebugContext,
});

/**
 * Represents system errors commonly raised by File IO.
 *
 * @see https://nodejs.org/api/errors.html#common-system-errors
 */
export type SystemError = {
  type: ErrorType.SYSTEM;

  code: SystemErrorCode;
};

export enum SystemErrorCode {
  EACCES = 'EACCES',
  EEXIST = 'EEXIST',
  EISDIR = 'EISDIR',
  EMFILE = 'EMFILE',
  ENOENT = 'ENOENT',
  ENOTDIR = 'ENOTDIR',
  ENOTEMPTY = 'ENOTEMPTY',
  EPERM = 'EPERM',
}

export const createSystemError = (
  details: Omit<SystemError, 'type'>,
): SystemError => ({
  type: ErrorType.SYSTEM,
  ...details,
});
