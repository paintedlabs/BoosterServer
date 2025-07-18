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
exports.fetchPrices = void 0;
const __typia_transform__assertGuard = __importStar(require("typia/lib/internal/_assertGuard.js"));
const net = __importStar(require("../../core/net/src"));
const status = __importStar(require("../../core/status/src"));
const typia_1 = __importDefault(require("typia"));
const validation = __importStar(require("./validation"));
const logger_1 = __importDefault(require("../../../logger"));
/**
 * Fetches all prices for a specific group scraped by tcgcsv.
 *
 * @param options - Fetch options.
 *
 * @return A list of prices.
 */
const fetchPrices = async (options) => {
    const { categoryId, groupId } = options;
    const url = `https://tcgcsv.com/tcgplayer/${categoryId}/groups/${groupId}/prices`;
    const maybeBody = await net.fetchBody(url);
    if (!status.isOk(maybeBody)) {
        return maybeBody;
    }
    const body = maybeBody.value;
    try {
        const pricesResponse = (() => { const __is = input => "string" === typeof input; let _errorFactory; const __assert = (input, errorFactory) => {
            if (false === __is(input)) {
                _errorFactory = errorFactory;
                ((input, _path, _exceptionable = true) => "string" === typeof input || __typia_transform__assertGuard._assertGuard(true, {
                    method: "validation.parsePricesEndpointResponse",
                    path: _path + "",
                    expected: "string",
                    value: input
                }, _errorFactory))(input, "$input", true);
            }
            return input;
        }; return (input, errorFactory) => __assert(JSON.parse(input), errorFactory); })()(body);
        return status.fromValue(pricesResponse.results);
    }
    catch (e) {
        if (e instanceof typia_1.default.TypeGuardError) {
            logger_1.default.error({ error: e }, `Typia validation/parse error during fetchPrices for URL: ${url}`);
            return status.fromError(e);
        }
        if (e instanceof SyntaxError) {
            logger_1.default.error({ error: e }, `JSON Syntax error during fetchPrices for URL: ${url}`);
            return status.fromError(e);
        }
        const errorMessage = e instanceof Error ? e.message : 'Unknown error during fetchPrices';
        const unknownError = new Error(errorMessage);
        logger_1.default.error({ originalError: e, url }, `Unexpected error during fetchPrices`);
        return status.fromError(unknownError);
    }
};
exports.fetchPrices = fetchPrices;
