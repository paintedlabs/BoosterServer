import * as net from './src/core/net/src'; // Corrected path
import * as status from './src/core/status/src'; // Corrected path
import typia from 'typia';
import * as TcgCsvTypes from './types'; // Assuming types.ts is in the same directory
import logger from './logger'; // Assuming logger.ts is in the same directory

// --- Error Types ---
// Define specific error types for this service for better error handling downstream

export enum TcgCsvErrorType {
  NETWORK_ERROR = 'TCGCSV_NETWORK_ERROR',
  NO_CONTENT = 'TCGCSV_NO_CONTENT',
  UNEXPECTED_STATUS = 'TCGCSV_UNEXPECTED_STATUS',
  JSON_PARSE_ERROR = 'TCGCSV_JSON_PARSE_ERROR',
  VALIDATION_ERROR = 'TCGCSV_VALIDATION_ERROR',
  API_ERROR = 'TCGCSV_API_ERROR', // Errors reported by the TCG CSV API itself
}

export type TcgCsvNetworkError = {
  type: TcgCsvErrorType.NETWORK_ERROR;
  originalError: net.UnknownError;
};
export type TcgCsvNoContentError = { type: TcgCsvErrorType.NO_CONTENT };
export type TcgCsvUnexpectedStatusError = {
  type: TcgCsvErrorType.UNEXPECTED_STATUS;
  expected: number;
  observed: number;
};
export type TcgCsvJsonParseError = {
  type: TcgCsvErrorType.JSON_PARSE_ERROR;
  message: string;
};
export type TcgCsvValidationError = {
  type: TcgCsvErrorType.VALIDATION_ERROR;
  errors: typia.IValidation.IError[];
};
export type TcgCsvApiError = {
  type: TcgCsvErrorType.API_ERROR;
  errors: Array<unknown>;
};

export type TcgCsvError =
  | TcgCsvNetworkError
  | TcgCsvNoContentError
  | TcgCsvUnexpectedStatusError
  | TcgCsvJsonParseError
  | TcgCsvValidationError
  | TcgCsvApiError;

// Helper to create a StatusOr with TcgCsvError
function createTcgCsvError<E extends TcgCsvError>(
  error: E
): status.StatusOr<never, E> {
  return status.fromError(error);
}

// --- Generic Fetch and Validate Function ---

async function fetchAndValidate<T>(
  url: string,
  asserter: (input: unknown) => T
): Promise<status.StatusOr<T, TcgCsvError>> {
  logger.info(`Fetching data from ${url}`);
  const maybeBody = await net.fetchBody(url);

  if (!status.isOk(maybeBody)) {
    const error = maybeBody.error;
    logger.error(`Network error fetching ${url}: ${JSON.stringify(error)}`);
    switch (error.type) {
      case net.ErrorType.NO_CONTENT:
        return createTcgCsvError({ type: TcgCsvErrorType.NO_CONTENT });
      case net.ErrorType.UNEXPECTED_STATUS:
        return createTcgCsvError({
          type: TcgCsvErrorType.UNEXPECTED_STATUS,
          expected: error.expected,
          observed: error.observed,
        });
      case net.ErrorType.UNKNOWN:
      default:
        return createTcgCsvError({
          type: TcgCsvErrorType.NETWORK_ERROR,
          originalError: error,
        });
    }
  }

  const bodyText = maybeBody.value;
  let parsedJson: unknown;
  try {
    // @ts-ignore - Suppress persistent, likely incorrect linter error on this line
    parsedJson = JSON.parse(bodyText);
  } catch (e) {
    const errorMsg = `JSON parse error for ${url}: ${e instanceof Error ? e.message : String(e)}`;
    logger.error({}, errorMsg);
    return createTcgCsvError({
      type: TcgCsvErrorType.JSON_PARSE_ERROR,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  let validatedData: T;
  try {
    validatedData = asserter(parsedJson);
  } catch (error: unknown) {
    // Log the raw error for debugging purposes
    logger.error(
      { rawError: error }, // Log the raw error object
      `Typia assertion failed for ${url}`
    );

    // Check if the error is a Typia validation error and extract detailed errors
    let validationErrors: typia.IValidation.IError[] = [];
    if (
      error &&
      typeof error === 'object' &&
      'errors' in error &&
      Array.isArray(error.errors)
      // Add a type guard or further check if needed to ensure elements are IValidation.IError
      // For now, assume 'errors' contains the correct type if it exists and is an array.
    ) {
      // Attempt to cast, assuming the structure matches.
      // A more robust solution might involve a custom type guard for typia's error structure.
      validationErrors = error.errors as typia.IValidation.IError[];
    } else {
      // Fallback if the error structure is unexpected
      validationErrors = [
        {
          path: 'unknown validation error path',
          expected: 'valid data matching type',
          value:
            error instanceof Error ? error.message : 'Unknown error structure',
        },
      ];
    }

    // Treat any assertion error as a validation failure
    return createTcgCsvError({
      type: TcgCsvErrorType.VALIDATION_ERROR,
      errors: validationErrors, // Pass the extracted Typia errors
    });
  }

  const apiResponse = validatedData as {
    success: boolean;
    errors: Array<unknown>;
  };
  if (
    !apiResponse.success ||
    (apiResponse.errors && apiResponse.errors.length > 0)
  ) {
    logger.error(
      `TCG CSV API reported errors for ${url}: ${JSON.stringify(apiResponse.errors)}`
    );
    return createTcgCsvError({
      type: TcgCsvErrorType.API_ERROR,
      errors: apiResponse.errors || [],
    });
  }

  logger.info(`Successfully fetched and validated data from ${url}`);
  return status.fromValue(validatedData);
}

// --- Service Functions ---

const TCGPLAYER_CATEGORY_ID_MTG = 1; // Assuming 1 is Magic: The Gathering
const BASE_URL = 'https://tcgcsv.com/tcgplayer';

/**
 * Fetches all TCGPlayer groups (sets) for a specific category.
 * Defaults to MTG category (ID 1).
 */
export async function fetchGroups(
  categoryId: number = TCGPLAYER_CATEGORY_ID_MTG
): Promise<status.StatusOr<TcgCsvTypes.TcgCsvGroup[], TcgCsvError>> {
  const url = `${BASE_URL}/${categoryId}/groups`;
  const asserter = (input: unknown) =>
    typia.assert<TcgCsvTypes.TcgCsvGroupsEndpointResponse>(input);
  const result = await fetchAndValidate(url, asserter);
  return status.isOk(result) ? status.fromValue(result.value.results) : result;
}

/**
 * Fetches all TCGPlayer products for a specific category and group.
 * Defaults to MTG category (ID 1).
 */
export async function fetchProducts(
  groupId: number,
  categoryId: number = TCGPLAYER_CATEGORY_ID_MTG
): Promise<status.StatusOr<TcgCsvTypes.TcgCsvProduct[], TcgCsvError>> {
  const url = `${BASE_URL}/${categoryId}/${groupId}/products`;
  const asserter = (input: unknown) =>
    typia.assert<TcgCsvTypes.TcgCsvProductsEndpointResponse>(input);
  const result = await fetchAndValidate(url, asserter);
  return status.isOk(result) ? status.fromValue(result.value.results) : result;
}

/**
 * Fetches all TCGPlayer prices for a specific category and group.
 * Defaults to MTG category (ID 1).
 */
export async function fetchPrices(
  groupId: number,
  categoryId: number = TCGPLAYER_CATEGORY_ID_MTG
): Promise<status.StatusOr<TcgCsvTypes.TcgCsvPrice[], TcgCsvError>> {
  const url = `${BASE_URL}/${categoryId}/${groupId}/prices`;
  const asserter = (input: unknown) =>
    typia.assert<TcgCsvTypes.TcgCsvPricesEndpointResponse>(input);
  const result = await fetchAndValidate(url, asserter);
  return status.isOk(result) ? status.fromValue(result.value.results) : result;
}
