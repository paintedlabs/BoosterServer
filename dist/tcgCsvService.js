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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const typia_1 = __importDefault(require("typia"));
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
function fetchAndValidate(url, asserter) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info(`Fetching data from ${url}`);
        const maybeBody = yield net.fetchBody(url);
        if (!status.isOk(maybeBody)) {
            const error = maybeBody.error;
            logger_1.default.error(`Network error fetching ${url}: ${JSON.stringify(error)}`);
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
            // @ts-ignore - Suppress persistent, likely incorrect linter error on this line
            parsedJson = JSON.parse(bodyText);
        }
        catch (e) {
            const errorMsg = `JSON parse error for ${url}: ${e instanceof Error ? e.message : String(e)}`;
            logger_1.default.error({}, errorMsg);
            return createTcgCsvError({
                type: TcgCsvErrorType.JSON_PARSE_ERROR,
                message: e instanceof Error ? e.message : String(e),
            });
        }
        let validatedData;
        try {
            validatedData = asserter(parsedJson);
        }
        catch (error) {
            // Log the raw error for debugging purposes
            logger_1.default.error({ rawError: error }, // Log the raw error object
            `Typia assertion failed for ${url}`);
            // Check if the error is a Typia validation error and extract detailed errors
            let validationErrors = [];
            if (error &&
                typeof error === 'object' &&
                'errors' in error &&
                Array.isArray(error.errors)
            // Add a type guard or further check if needed to ensure elements are IValidation.IError
            // For now, assume 'errors' contains the correct type if it exists and is an array.
            ) {
                // Attempt to cast, assuming the structure matches.
                // A more robust solution might involve a custom type guard for typia's error structure.
                validationErrors = error.errors;
            }
            else {
                // Fallback if the error structure is unexpected
                validationErrors = [
                    {
                        path: 'unknown validation error path',
                        expected: 'valid data matching type',
                        value: error instanceof Error ? error.message : 'Unknown error structure',
                    },
                ];
            }
            // Treat any assertion error as a validation failure
            return createTcgCsvError({
                type: TcgCsvErrorType.VALIDATION_ERROR,
                errors: validationErrors, // Pass the extracted Typia errors
            });
        }
        const apiResponse = validatedData;
        if (!apiResponse.success ||
            (apiResponse.errors && apiResponse.errors.length > 0)) {
            logger_1.default.error(`TCG CSV API reported errors for ${url}: ${JSON.stringify(apiResponse.errors)}`);
            return createTcgCsvError({
                type: TcgCsvErrorType.API_ERROR,
                errors: apiResponse.errors || [],
            });
        }
        logger_1.default.info(`Successfully fetched and validated data from ${url}`);
        return status.fromValue(validatedData);
    });
}
// --- Service Functions ---
const TCGPLAYER_CATEGORY_ID_MTG = 1; // Assuming 1 is Magic: The Gathering
const BASE_URL = 'https://tcgcsv.com/tcgplayer';
/**
 * Fetches all TCGPlayer groups (sets) for a specific category.
 * Defaults to MTG category (ID 1).
 */
function fetchGroups() {
    return __awaiter(this, arguments, void 0, function* (categoryId = TCGPLAYER_CATEGORY_ID_MTG) {
        const url = `${BASE_URL}/${categoryId}/groups`;
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
        const result = yield fetchAndValidate(url, asserter);
        return status.isOk(result) ? status.fromValue(result.value.results) : result;
    });
}
/**
 * Fetches all TCGPlayer products for a specific category and group.
 * Defaults to MTG category (ID 1).
 */
function fetchProducts(groupId_1) {
    return __awaiter(this, arguments, void 0, function* (groupId, categoryId = TCGPLAYER_CATEGORY_ID_MTG) {
        const url = `${BASE_URL}/${categoryId}/${groupId}/products`;
        const asserter = (input) => (() => { const _io0 = input => "boolean" === typeof input.success && Array.isArray(input.errors) && (Array.isArray(input.results) && input.results.every(elem => "object" === typeof elem && null !== elem && _io1(elem))); const _io1 = input => "string" === typeof input.cleanName && "string" === typeof input.name && "number" === typeof input.productId && "number" === typeof input.groupId && "number" === typeof input.categoryId && "string" === typeof input.imageUrl && "string" === typeof input.url && "string" === typeof input.modifiedOn; const _ao0 = (input, _path, _exceptionable = true) => ("boolean" === typeof input.success || __typia_transform__assertGuard._assertGuard(_exceptionable, {
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
        const result = yield fetchAndValidate(url, asserter);
        return status.isOk(result) ? status.fromValue(result.value.results) : result;
    });
}
/**
 * Fetches all TCGPlayer prices for a specific category and group.
 * Defaults to MTG category (ID 1).
 */
function fetchPrices(groupId_1) {
    return __awaiter(this, arguments, void 0, function* (groupId, categoryId = TCGPLAYER_CATEGORY_ID_MTG) {
        const url = `${BASE_URL}/${categoryId}/${groupId}/prices`;
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
        const result = yield fetchAndValidate(url, asserter);
        return status.isOk(result) ? status.fromValue(result.value.results) : result;
    });
}
