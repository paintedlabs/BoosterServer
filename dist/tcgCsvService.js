"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TcgCsvErrorType = void 0;
exports.fetchGroups = fetchGroups;
exports.fetchProducts = fetchProducts;
exports.fetchPrices = fetchPrices;
const __typia_transform__assertGuard = __importStar(require("typia/lib/internal/_assertGuard.js"));
const net = __importStar(require("./src/core/net/src")); // Corrected path
const status = __importStar(require("./src/core/status/src")); // Corrected path
const typia = __importStar(require("typia"));
const logger_1 = __importDefault(require("./logger")); // Assuming logger.ts is in the same directory
// --- Error Types ---
// Define specific error types for this service for better error handling downstream
var TcgCsvErrorType;
(function (TcgCsvErrorType) {
    TcgCsvErrorType["NETWORK_ERROR"] = "TCGCSV_NETWORK_ERROR";
    TcgCsvErrorType["NO_CONTENT"] = "TCGCSV_NO_CONTENT";
    TcgCsvErrorType["UNEXPECTED_STATUS"] = "TCGCSV_UNEXPECTED_STATUS";
    TcgCsvErrorType["JSON_PARSE_ERROR"] = "TCGCSV_JSON_PARSE_ERROR";
    TcgCsvErrorType["VALIDATION_ERROR"] = "TCGCSV_VALIDATION_ERROR";
    TcgCsvErrorType["API_ERROR"] = "TCGCSV_API_ERROR";
})(TcgCsvErrorType || (exports.TcgCsvErrorType = TcgCsvErrorType = {}));
// Helper to create a StatusOr with TcgCsvError
function createTcgCsvError(error) {
    return status.fromError(error);
}
// --- Generic Fetch and Validate Function ---
async function fetchAndValidate(url, asserter, // Asserter remains for re-validation if needed
// Add a flag or type check to know if price correction logic is applicable
shouldCorrectPrices = false) {
    logger_1.default.trace(`Fetching data from ${url}`);
    const maybeBody = await net.fetchBody(url);
    if (!status.isOk(maybeBody)) {
        const error = maybeBody.error;
        // Log specific network error type before returning
        logger_1.default.error({ url, error }, `Network error fetching data`);
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
    let parsedJson;
    try {
        parsedJson = JSON.parse(bodyText);
    }
    catch (e) {
        // Log specific JSON parse error before returning
        const errorMsg = `JSON parse error for ${url}: ${e instanceof Error ? e.message : String(e)}`;
        logger_1.default.error({ url, parseError: e }, errorMsg);
        return createTcgCsvError({
            type: TcgCsvErrorType.JSON_PARSE_ERROR,
            message: e instanceof Error ? e.message : String(e),
        });
    }
    // Validate using the provided asserter function
    try {
        const validatedData = asserter(parsedJson);
        logger_1.default.trace({ url }, `Initial validation successful.`);
        // Check API success status AFTER successful validation
        const apiResponse = validatedData; // Assume structure includes success/errors
        if (!apiResponse.success ||
            (apiResponse.errors && apiResponse.errors.length > 0)) {
            logger_1.default.error({ url, apiErrors: apiResponse.errors }, `TCG CSV API reported errors`);
            return createTcgCsvError({
                type: TcgCsvErrorType.API_ERROR,
                errors: apiResponse.errors || [],
            });
        }
        logger_1.default.trace(`Successfully fetched and validated data from ${url}`);
        return status.fromValue(validatedData);
    }
    catch (initialError) {
        // Initial assertion failed, check if correction is applicable
        logger_1.default.trace({ url, error: initialError }, `Initial validation failed for ${url}. Checking if correction is applicable...`);
        let corrected = false;
        // Only attempt price correction if flagged AND if the structure looks like Products/Prices response
        if (shouldCorrectPrices &&
            parsedJson &&
            Array.isArray(parsedJson.results)) {
            logger_1.default.trace({ url }, 'Attempting price field corrections...');
            parsedJson.results.forEach((item, index) => {
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
            logger_1.default.trace({ url }, `Attempting validation again after corrections`);
            try {
                // Retry assertion with the potentially corrected data
                const validatedData = asserter(parsedJson);
                logger_1.default.trace({ url }, `Validation successful after correction.`);
                // Check API success status AFTER successful validation
                const apiResponse = validatedData; // Assume structure includes success/errors
                if (!apiResponse.success ||
                    (apiResponse.errors && apiResponse.errors.length > 0)) {
                    logger_1.default.error({ url, apiErrors: apiResponse.errors }, `TCG CSV API reported errors AFTER correction`);
                    return createTcgCsvError({
                        type: TcgCsvErrorType.API_ERROR,
                        errors: apiResponse.errors || [],
                    });
                }
                return status.fromValue(validatedData);
            }
            catch (errorAfterCorrection) {
                logger_1.default.error({ url, rawError: errorAfterCorrection }, `Typia assertion failed EVEN AFTER CORRECTION`);
                // Fall through to return original validation error below
            }
        }
        // Log specific validation error (use the initial error that was caught)
        // Extract errors if it's a typia error object
        let validationErrors = [];
        if (initialError &&
            typeof initialError === 'object' &&
            'errors' in initialError &&
            Array.isArray(initialError.errors)) {
            validationErrors = initialError.errors;
        }
        else if (initialError instanceof Error) {
            validationErrors = [
                {
                    path: 'unknown',
                    expected: 'valid data',
                    value: initialError.message,
                },
            ];
        }
        else {
            validationErrors = [
                {
                    path: 'unknown',
                    expected: 'valid data',
                    value: 'Unknown validation error',
                },
            ];
        }
        logger_1.default.error({ url, typiaErrors: validationErrors }, `Typia validation failed permanently`);
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
async function fetchGroups(categoryId = TCGPLAYER_CATEGORY_ID_MTG) {
    const url = `${BASE_URL}/${categoryId}/groups`;
    // Define the specific asserter for the Groups endpoint response type
    const asserter = (input) => (() => { const _io0 = input => "boolean" === typeof input.success && Array.isArray(input.errors) && (Array.isArray(input.results) && input.results.every(elem => "object" === typeof elem && null !== elem && _io1(elem))); const _io1 = input => "string" === typeof input.name && "string" === typeof input.abbreviation && "number" === typeof input.groupId && "number" === typeof input.categoryId && "string" === typeof input.modifiedOn && "string" === typeof input.publishedOn; const _ao0 = (input, _path, _exceptionable = true) => ("boolean" === typeof input.success || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".success",
        expected: "boolean",
        value: input.success
    }, _errorFactory)) && (Array.isArray(input.errors) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".errors",
        expected: "Array<unknown>",
        value: input.errors
    }, _errorFactory)) && ((Array.isArray(input.results) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".results",
        expected: "Array<TcgCsvGroup>",
        value: input.results
    }, _errorFactory)) && input.results.every((elem, _index2) => ("object" === typeof elem && null !== elem || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".results[" + _index2 + "]",
        expected: "TcgCsvGroup",
        value: elem
    }, _errorFactory)) && _ao1(elem, _path + ".results[" + _index2 + "]", true && _exceptionable) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".results[" + _index2 + "]",
        expected: "TcgCsvGroup",
        value: elem
    }, _errorFactory)) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".results",
        expected: "Array<TcgCsvGroup>",
        value: input.results
    }, _errorFactory)); const _ao1 = (input, _path, _exceptionable = true) => ("string" === typeof input.name || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".name",
        expected: "string",
        value: input.name
    }, _errorFactory)) && ("string" === typeof input.abbreviation || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".abbreviation",
        expected: "string",
        value: input.abbreviation
    }, _errorFactory)) && ("number" === typeof input.groupId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".groupId",
        expected: "number",
        value: input.groupId
    }, _errorFactory)) && ("number" === typeof input.categoryId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".categoryId",
        expected: "number",
        value: input.categoryId
    }, _errorFactory)) && ("string" === typeof input.modifiedOn || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".modifiedOn",
        expected: "string",
        value: input.modifiedOn
    }, _errorFactory)) && ("string" === typeof input.publishedOn || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".publishedOn",
        expected: "string",
        value: input.publishedOn
    }, _errorFactory)); const __is = input => "object" === typeof input && null !== input && _io0(input); let _errorFactory; return (input, errorFactory) => {
        if (false === __is(input)) {
            _errorFactory = errorFactory;
            ((input, _path, _exceptionable = true) => ("object" === typeof input && null !== input || __typia_transform__assertGuard._assertGuard(true, {
                method: "typia.assert",
                path: _path + "",
                expected: "TcgCsvGroupsEndpointResponse",
                value: input
            }, _errorFactory)) && _ao0(input, _path + "", true) || __typia_transform__assertGuard._assertGuard(true, {
                method: "typia.assert",
                path: _path + "",
                expected: "TcgCsvGroupsEndpointResponse",
                value: input
            }, _errorFactory))(input, "$input", true);
        }
        return input;
    }; })()(input);
    // Call fetchAndValidate, price correction is NOT applicable here
    const result = await fetchAndValidate(url, asserter, false);
    // Extract results array if successful
    return status.isOk(result) ? status.fromValue(result.value.results) : result;
}
/**
 * Fetches all TCGPlayer products for a specific category and group.
 * Defaults to MTG category (ID 1).
 */
async function fetchProducts(groupId, categoryId = TCGPLAYER_CATEGORY_ID_MTG) {
    const url = `${BASE_URL}/${categoryId}/${groupId}/products`;
    // Define the specific asserter for the Products endpoint response type
    const asserter = (input) => (() => { const _io0 = input => "boolean" === typeof input.success && Array.isArray(input.errors) && (Array.isArray(input.results) && input.results.every(elem => "object" === typeof elem && null !== elem && _io1(elem))); const _io1 = input => "string" === typeof input.cleanName && "string" === typeof input.name && "number" === typeof input.productId && "number" === typeof input.groupId && "number" === typeof input.categoryId && "string" === typeof input.imageUrl && "string" === typeof input.url && "string" === typeof input.modifiedOn && (null === input.marketPrice || "string" === typeof input.marketPrice || "number" === typeof input.marketPrice) && (null === input.directLowPrice || "number" === typeof input.directLowPrice) && (null === input.avgPrice || "number" === typeof input.avgPrice) && (null === input.foilPrice || "number" === typeof input.foilPrice) && (null === input.normalPrice || "number" === typeof input.normalPrice) && (null === input.etchedPrice || "number" === typeof input.etchedPrice) && (undefined === input.tcgplayerProductId || "string" === typeof input.tcgplayerProductId) && (undefined === input.tcgplayerEtchedProductId || "string" === typeof input.tcgplayerEtchedProductId) && (undefined === input.cardKingdomId || "string" === typeof input.cardKingdomId) && (undefined === input.cardKingdomFoilId || "string" === typeof input.cardKingdomFoilId) && (undefined === input.cardKingdomEtchedId || "string" === typeof input.cardKingdomEtchedId) && (undefined === input.cardsphereId || "string" === typeof input.cardsphereId) && (undefined === input.cardsphereFoilId || "string" === typeof input.cardsphereFoilId) && (undefined === input.cardtraderId || "string" === typeof input.cardtraderId) && (undefined === input.csiId || "string" === typeof input.csiId) && (undefined === input.mcmId || "string" === typeof input.mcmId) && (undefined === input.mcmMetaId || "string" === typeof input.mcmMetaId) && (undefined === input.miniaturemarketId || "string" === typeof input.miniaturemarketId) && (undefined === input.mtgArenaId || "string" === typeof input.mtgArenaId) && (undefined === input.mtgjsonFoilVersionId || "string" === typeof input.mtgjsonFoilVersionId) && (undefined === input.mtgjsonNonFoilVersionId || "string" === typeof input.mtgjsonNonFoilVersionId) && (undefined === input.mtgjsonV4Id || "string" === typeof input.mtgjsonV4Id) && (undefined === input.mtgoFoilId || "string" === typeof input.mtgoFoilId) && (undefined === input.mtgoId || "string" === typeof input.mtgoId) && (undefined === input.multiverseId || "string" === typeof input.multiverseId) && (undefined === input.scgId || "string" === typeof input.scgId) && (undefined === input.scryfallId || "string" === typeof input.scryfallId) && (undefined === input.scryfallCardBackId || "string" === typeof input.scryfallCardBackId) && (undefined === input.scryfallOracleId || "string" === typeof input.scryfallOracleId) && (undefined === input.scryfallIllustrationId || "string" === typeof input.scryfallIllustrationId) && (undefined === input.tntId || "string" === typeof input.tntId); const _ao0 = (input, _path, _exceptionable = true) => ("boolean" === typeof input.success || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".success",
        expected: "boolean",
        value: input.success
    }, _errorFactory)) && (Array.isArray(input.errors) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".errors",
        expected: "Array<unknown>",
        value: input.errors
    }, _errorFactory)) && ((Array.isArray(input.results) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".results",
        expected: "Array<TcgCsvProduct>",
        value: input.results
    }, _errorFactory)) && input.results.every((elem, _index2) => ("object" === typeof elem && null !== elem || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".results[" + _index2 + "]",
        expected: "TcgCsvProduct",
        value: elem
    }, _errorFactory)) && _ao1(elem, _path + ".results[" + _index2 + "]", true && _exceptionable) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".results[" + _index2 + "]",
        expected: "TcgCsvProduct",
        value: elem
    }, _errorFactory)) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".results",
        expected: "Array<TcgCsvProduct>",
        value: input.results
    }, _errorFactory)); const _ao1 = (input, _path, _exceptionable = true) => ("string" === typeof input.cleanName || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".cleanName",
        expected: "string",
        value: input.cleanName
    }, _errorFactory)) && ("string" === typeof input.name || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".name",
        expected: "string",
        value: input.name
    }, _errorFactory)) && ("number" === typeof input.productId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".productId",
        expected: "number",
        value: input.productId
    }, _errorFactory)) && ("number" === typeof input.groupId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".groupId",
        expected: "number",
        value: input.groupId
    }, _errorFactory)) && ("number" === typeof input.categoryId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".categoryId",
        expected: "number",
        value: input.categoryId
    }, _errorFactory)) && ("string" === typeof input.imageUrl || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".imageUrl",
        expected: "string",
        value: input.imageUrl
    }, _errorFactory)) && ("string" === typeof input.url || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".url",
        expected: "string",
        value: input.url
    }, _errorFactory)) && ("string" === typeof input.modifiedOn || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".modifiedOn",
        expected: "string",
        value: input.modifiedOn
    }, _errorFactory)) && (null === input.marketPrice || "string" === typeof input.marketPrice || "number" === typeof input.marketPrice || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".marketPrice",
        expected: "(null | number | string)",
        value: input.marketPrice
    }, _errorFactory)) && (null === input.directLowPrice || "number" === typeof input.directLowPrice || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".directLowPrice",
        expected: "(null | number)",
        value: input.directLowPrice
    }, _errorFactory)) && (null === input.avgPrice || "number" === typeof input.avgPrice || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".avgPrice",
        expected: "(null | number)",
        value: input.avgPrice
    }, _errorFactory)) && (null === input.foilPrice || "number" === typeof input.foilPrice || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".foilPrice",
        expected: "(null | number)",
        value: input.foilPrice
    }, _errorFactory)) && (null === input.normalPrice || "number" === typeof input.normalPrice || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".normalPrice",
        expected: "(null | number)",
        value: input.normalPrice
    }, _errorFactory)) && (null === input.etchedPrice || "number" === typeof input.etchedPrice || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".etchedPrice",
        expected: "(null | number)",
        value: input.etchedPrice
    }, _errorFactory)) && (undefined === input.tcgplayerProductId || "string" === typeof input.tcgplayerProductId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".tcgplayerProductId",
        expected: "(string | undefined)",
        value: input.tcgplayerProductId
    }, _errorFactory)) && (undefined === input.tcgplayerEtchedProductId || "string" === typeof input.tcgplayerEtchedProductId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".tcgplayerEtchedProductId",
        expected: "(string | undefined)",
        value: input.tcgplayerEtchedProductId
    }, _errorFactory)) && (undefined === input.cardKingdomId || "string" === typeof input.cardKingdomId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".cardKingdomId",
        expected: "(string | undefined)",
        value: input.cardKingdomId
    }, _errorFactory)) && (undefined === input.cardKingdomFoilId || "string" === typeof input.cardKingdomFoilId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".cardKingdomFoilId",
        expected: "(string | undefined)",
        value: input.cardKingdomFoilId
    }, _errorFactory)) && (undefined === input.cardKingdomEtchedId || "string" === typeof input.cardKingdomEtchedId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".cardKingdomEtchedId",
        expected: "(string | undefined)",
        value: input.cardKingdomEtchedId
    }, _errorFactory)) && (undefined === input.cardsphereId || "string" === typeof input.cardsphereId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".cardsphereId",
        expected: "(string | undefined)",
        value: input.cardsphereId
    }, _errorFactory)) && (undefined === input.cardsphereFoilId || "string" === typeof input.cardsphereFoilId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".cardsphereFoilId",
        expected: "(string | undefined)",
        value: input.cardsphereFoilId
    }, _errorFactory)) && (undefined === input.cardtraderId || "string" === typeof input.cardtraderId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".cardtraderId",
        expected: "(string | undefined)",
        value: input.cardtraderId
    }, _errorFactory)) && (undefined === input.csiId || "string" === typeof input.csiId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".csiId",
        expected: "(string | undefined)",
        value: input.csiId
    }, _errorFactory)) && (undefined === input.mcmId || "string" === typeof input.mcmId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".mcmId",
        expected: "(string | undefined)",
        value: input.mcmId
    }, _errorFactory)) && (undefined === input.mcmMetaId || "string" === typeof input.mcmMetaId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".mcmMetaId",
        expected: "(string | undefined)",
        value: input.mcmMetaId
    }, _errorFactory)) && (undefined === input.miniaturemarketId || "string" === typeof input.miniaturemarketId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".miniaturemarketId",
        expected: "(string | undefined)",
        value: input.miniaturemarketId
    }, _errorFactory)) && (undefined === input.mtgArenaId || "string" === typeof input.mtgArenaId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".mtgArenaId",
        expected: "(string | undefined)",
        value: input.mtgArenaId
    }, _errorFactory)) && (undefined === input.mtgjsonFoilVersionId || "string" === typeof input.mtgjsonFoilVersionId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".mtgjsonFoilVersionId",
        expected: "(string | undefined)",
        value: input.mtgjsonFoilVersionId
    }, _errorFactory)) && (undefined === input.mtgjsonNonFoilVersionId || "string" === typeof input.mtgjsonNonFoilVersionId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".mtgjsonNonFoilVersionId",
        expected: "(string | undefined)",
        value: input.mtgjsonNonFoilVersionId
    }, _errorFactory)) && (undefined === input.mtgjsonV4Id || "string" === typeof input.mtgjsonV4Id || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".mtgjsonV4Id",
        expected: "(string | undefined)",
        value: input.mtgjsonV4Id
    }, _errorFactory)) && (undefined === input.mtgoFoilId || "string" === typeof input.mtgoFoilId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".mtgoFoilId",
        expected: "(string | undefined)",
        value: input.mtgoFoilId
    }, _errorFactory)) && (undefined === input.mtgoId || "string" === typeof input.mtgoId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".mtgoId",
        expected: "(string | undefined)",
        value: input.mtgoId
    }, _errorFactory)) && (undefined === input.multiverseId || "string" === typeof input.multiverseId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".multiverseId",
        expected: "(string | undefined)",
        value: input.multiverseId
    }, _errorFactory)) && (undefined === input.scgId || "string" === typeof input.scgId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".scgId",
        expected: "(string | undefined)",
        value: input.scgId
    }, _errorFactory)) && (undefined === input.scryfallId || "string" === typeof input.scryfallId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".scryfallId",
        expected: "(string | undefined)",
        value: input.scryfallId
    }, _errorFactory)) && (undefined === input.scryfallCardBackId || "string" === typeof input.scryfallCardBackId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".scryfallCardBackId",
        expected: "(string | undefined)",
        value: input.scryfallCardBackId
    }, _errorFactory)) && (undefined === input.scryfallOracleId || "string" === typeof input.scryfallOracleId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".scryfallOracleId",
        expected: "(string | undefined)",
        value: input.scryfallOracleId
    }, _errorFactory)) && (undefined === input.scryfallIllustrationId || "string" === typeof input.scryfallIllustrationId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".scryfallIllustrationId",
        expected: "(string | undefined)",
        value: input.scryfallIllustrationId
    }, _errorFactory)) && (undefined === input.tntId || "string" === typeof input.tntId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".tntId",
        expected: "(string | undefined)",
        value: input.tntId
    }, _errorFactory)); const __is = input => "object" === typeof input && null !== input && _io0(input); let _errorFactory; return (input, errorFactory) => {
        if (false === __is(input)) {
            _errorFactory = errorFactory;
            ((input, _path, _exceptionable = true) => ("object" === typeof input && null !== input || __typia_transform__assertGuard._assertGuard(true, {
                method: "typia.assert",
                path: _path + "",
                expected: "TcgCsvProductsEndpointResponse",
                value: input
            }, _errorFactory)) && _ao0(input, _path + "", true) || __typia_transform__assertGuard._assertGuard(true, {
                method: "typia.assert",
                path: _path + "",
                expected: "TcgCsvProductsEndpointResponse",
                value: input
            }, _errorFactory))(input, "$input", true);
        }
        return input;
    }; })()(input);
    // Call fetchAndValidate, price correction IS applicable here
    const result = await fetchAndValidate(url, asserter, true);
    // Extract results array if successful
    return status.isOk(result) ? status.fromValue(result.value.results) : result;
}
/**
 * Fetches all TCGPlayer prices for a specific category and group.
 * Defaults to MTG category (ID 1).
 */
async function fetchPrices(groupId, categoryId = TCGPLAYER_CATEGORY_ID_MTG) {
    const url = `${BASE_URL}/${categoryId}/${groupId}/prices`;
    // Define the specific asserter for the Prices endpoint response type
    const asserter = (input) => (() => { const _io0 = input => "boolean" === typeof input.success && Array.isArray(input.errors) && (Array.isArray(input.results) && input.results.every(elem => "object" === typeof elem && null !== elem && _io1(elem))); const _io1 = input => "number" === typeof input.productId && (null === input.marketPrice || undefined === input.marketPrice || "number" === typeof input.marketPrice) && (null === input.directLowPrice || undefined === input.directLowPrice || "number" === typeof input.directLowPrice) && (null === input.lowPrice || undefined === input.lowPrice || "number" === typeof input.lowPrice) && (null === input.midPrice || undefined === input.midPrice || "number" === typeof input.midPrice) && (null === input.highPrice || undefined === input.highPrice || "number" === typeof input.highPrice) && ("Normal" === input.subTypeName || "Foil" === input.subTypeName); const _ao0 = (input, _path, _exceptionable = true) => ("boolean" === typeof input.success || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".success",
        expected: "boolean",
        value: input.success
    }, _errorFactory)) && (Array.isArray(input.errors) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".errors",
        expected: "Array<unknown>",
        value: input.errors
    }, _errorFactory)) && ((Array.isArray(input.results) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".results",
        expected: "Array<TcgCsvPrice>",
        value: input.results
    }, _errorFactory)) && input.results.every((elem, _index2) => ("object" === typeof elem && null !== elem || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".results[" + _index2 + "]",
        expected: "TcgCsvPrice",
        value: elem
    }, _errorFactory)) && _ao1(elem, _path + ".results[" + _index2 + "]", true && _exceptionable) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".results[" + _index2 + "]",
        expected: "TcgCsvPrice",
        value: elem
    }, _errorFactory)) || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".results",
        expected: "Array<TcgCsvPrice>",
        value: input.results
    }, _errorFactory)); const _ao1 = (input, _path, _exceptionable = true) => ("number" === typeof input.productId || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".productId",
        expected: "number",
        value: input.productId
    }, _errorFactory)) && (null === input.marketPrice || undefined === input.marketPrice || "number" === typeof input.marketPrice || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".marketPrice",
        expected: "(null | number | undefined)",
        value: input.marketPrice
    }, _errorFactory)) && (null === input.directLowPrice || undefined === input.directLowPrice || "number" === typeof input.directLowPrice || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".directLowPrice",
        expected: "(null | number | undefined)",
        value: input.directLowPrice
    }, _errorFactory)) && (null === input.lowPrice || undefined === input.lowPrice || "number" === typeof input.lowPrice || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".lowPrice",
        expected: "(null | number | undefined)",
        value: input.lowPrice
    }, _errorFactory)) && (null === input.midPrice || undefined === input.midPrice || "number" === typeof input.midPrice || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".midPrice",
        expected: "(null | number | undefined)",
        value: input.midPrice
    }, _errorFactory)) && (null === input.highPrice || undefined === input.highPrice || "number" === typeof input.highPrice || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".highPrice",
        expected: "(null | number | undefined)",
        value: input.highPrice
    }, _errorFactory)) && ("Normal" === input.subTypeName || "Foil" === input.subTypeName || __typia_transform__assertGuard._assertGuard(_exceptionable, {
        method: "typia.assert",
        path: _path + ".subTypeName",
        expected: "(\"Foil\" | \"Normal\")",
        value: input.subTypeName
    }, _errorFactory)); const __is = input => "object" === typeof input && null !== input && _io0(input); let _errorFactory; return (input, errorFactory) => {
        if (false === __is(input)) {
            _errorFactory = errorFactory;
            ((input, _path, _exceptionable = true) => ("object" === typeof input && null !== input || __typia_transform__assertGuard._assertGuard(true, {
                method: "typia.assert",
                path: _path + "",
                expected: "TcgCsvPricesEndpointResponse",
                value: input
            }, _errorFactory)) && _ao0(input, _path + "", true) || __typia_transform__assertGuard._assertGuard(true, {
                method: "typia.assert",
                path: _path + "",
                expected: "TcgCsvPricesEndpointResponse",
                value: input
            }, _errorFactory))(input, "$input", true);
        }
        return input;
    }; })()(input);
    // Call fetchAndValidate, price correction IS applicable here
    const result = await fetchAndValidate(url, asserter, true);
    // Extract results array if successful
    return status.isOk(result) ? status.fromValue(result.value.results) : result;
}
