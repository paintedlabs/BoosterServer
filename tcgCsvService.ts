import * as net from './src/core/net/src'; // Corrected path
import * as status from './src/core/status/src'; // Corrected path
import * as typia from 'typia';
import * as TcgCsvTypes from './types'; // Update the import path
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
  asserter: (input: unknown) => T, // Asserter remains for re-validation if needed
  // Add a flag or type check to know if price correction logic is applicable
  shouldCorrectPrices: boolean = false
): Promise<status.StatusOr<T, TcgCsvError>> {
  logger.trace(`Fetching data from ${url}`);
  const maybeBody = await net.fetchBody(url);

  if (!status.isOk(maybeBody)) {
    const error = maybeBody.error;
    // Log specific network error type before returning
    logger.error({ url, error }, `Network error fetching data`);
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
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(bodyText);
  } catch (e) {
    // Log specific JSON parse error before returning
    const errorMsg = `JSON parse error for ${url}: ${e instanceof Error ? e.message : String(e)}`;
    logger.error({ url, parseError: e }, errorMsg);
    return createTcgCsvError({
      type: TcgCsvErrorType.JSON_PARSE_ERROR,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  // Validate using the provided asserter function
  try {
    const validatedData = asserter(parsedJson);
    logger.trace({ url }, `Initial validation successful.`);
    // Check API success status AFTER successful validation
    const apiResponse = validatedData as any; // Assume structure includes success/errors
    if (
      !apiResponse.success ||
      (apiResponse.errors && apiResponse.errors.length > 0)
    ) {
      logger.error(
        { url, apiErrors: apiResponse.errors },
        `TCG CSV API reported errors`
      );
      return createTcgCsvError({
        type: TcgCsvErrorType.API_ERROR,
        errors: apiResponse.errors || [],
      });
    }
    logger.trace(`Successfully fetched and validated data from ${url}`);
    return status.fromValue(validatedData);
  } catch (initialError: unknown) {
    // Initial assertion failed, check if correction is applicable
    logger.trace(
      { url, error: initialError },
      `Initial validation failed for ${url}. Checking if correction is applicable...`
    );
    let corrected = false;

    // Only attempt price correction if flagged AND if the structure looks like Products/Prices response
    if (
      shouldCorrectPrices &&
      parsedJson &&
      Array.isArray(parsedJson.results)
    ) {
      logger.trace({ url }, 'Attempting price field corrections...');
      parsedJson.results.forEach((item: any, index: number) => {
        const priceFields = [
          'marketPrice',
          'directLowPrice',
          'avgPrice',
          'foilPrice',
          'normalPrice',
          'etchedPrice',
        ];
        priceFields.forEach((field) => {
          const currentValue = item[field];
          const currentType = typeof currentValue;

          // Convert any non-number, non-null values to null
          if (currentValue !== null && currentType !== 'number') {
            // Log the problematic value before correction
            // logger.warn(
            //   {
            //     url,
            //     path: `results[${index}].${field}`,
            //     type: currentType,
            //     value: currentValue,
            //   },
            //   `Invalid type found for price field. Converting to null.`
            // );
            corrected = true; // Set corrected flag when we make a change

            // Convert undefined, empty string, or any other non-number value to null
            item[field] = null;
            // logger.info(
            //   { url, path: `results[${index}].${field}` },
            //   `Converted '${currentValue}' to null.`
            // );
          }
        });
      });
    }

    if (corrected) {
      logger.trace({ url }, `Attempting validation again after corrections`);
      try {
        // Retry assertion with the potentially corrected data
        const validatedData = asserter(parsedJson);
        logger.trace({ url }, `Validation successful after correction.`);
        // Check API success status AFTER successful validation
        const apiResponse = validatedData as any; // Assume structure includes success/errors
        if (
          !apiResponse.success ||
          (apiResponse.errors && apiResponse.errors.length > 0)
        ) {
          logger.error(
            { url, apiErrors: apiResponse.errors },
            `TCG CSV API reported errors AFTER correction`
          );
          return createTcgCsvError({
            type: TcgCsvErrorType.API_ERROR,
            errors: apiResponse.errors || [],
          });
        }
        return status.fromValue(validatedData);
      } catch (errorAfterCorrection: unknown) {
        logger.error(
          { url, rawError: errorAfterCorrection },
          `Typia assertion failed EVEN AFTER CORRECTION`
        );
        // Fall through to return original validation error below
      }
    }

    // Log specific validation error (use the initial error that was caught)
    // Extract errors if it's a typia error object
    let validationErrors: typia.IValidation.IError[] = [];
    if (
      initialError &&
      typeof initialError === 'object' &&
      'errors' in initialError &&
      Array.isArray(initialError.errors)
    ) {
      validationErrors = initialError.errors as typia.IValidation.IError[];
    } else if (initialError instanceof Error) {
      validationErrors = [
        {
          path: 'unknown',
          expected: 'valid data',
          value: initialError.message,
        },
      ];
    } else {
      validationErrors = [
        {
          path: 'unknown',
          expected: 'valid data',
          value: 'Unknown validation error',
        },
      ];
    }

    logger.error(
      { url, typiaErrors: validationErrors },
      `Typia validation failed permanently`
    );
    return createTcgCsvError({
      type: TcgCsvErrorType.VALIDATION_ERROR,
      errors: validationErrors,
    });
  }
}

// --- Service Functions ---

const TCGPLAYER_CATEGORY_ID_MTG = 1; // Assuming 1 is Magic: The Gathering
const BASE_URL = 'https://tcgcsv.com/tcgplayer';

/**
 * Fetches all TCGPlayer groups for a specific category.
 * Defaults to MTG category (ID 1).
 */
export async function fetchGroups(
  categoryId: number = TCGPLAYER_CATEGORY_ID_MTG
): Promise<status.StatusOr<TcgCsvTypes.TcgCsvGroup[], TcgCsvError>> {
  const url = `${BASE_URL}/${categoryId}/groups`;
  // Define the specific asserter for the Groups endpoint response type
  const asserter = (input: unknown) =>
    typia.assert<TcgCsvTypes.TcgCsvGroupsEndpointResponse>(input);
  // Call fetchAndValidate, price correction is NOT applicable here
  const result = await fetchAndValidate(url, asserter, false);
  // Extract results array if successful
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
  // Define the specific asserter for the Products endpoint response type
  const asserter = (input: unknown) =>
    typia.assert<TcgCsvTypes.TcgCsvProductsEndpointResponse>(input);
  // Call fetchAndValidate, price correction IS applicable here
  const result = await fetchAndValidate(url, asserter, true);
  // Extract results array if successful
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
  // Define the specific asserter for the Prices endpoint response type
  const asserter = (input: unknown) =>
    typia.assert<TcgCsvTypes.TcgCsvPricesEndpointResponse>(input);
  // Call fetchAndValidate, price correction IS applicable here
  const result = await fetchAndValidate(url, asserter, true);
  // Extract results array if successful
  return status.isOk(result) ? status.fromValue(result.value.results) : result;
}
