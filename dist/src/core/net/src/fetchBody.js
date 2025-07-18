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
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchBodyAsBytes = exports.fetchBody = void 0;
const status = __importStar(require("@core/status"));
const errors = __importStar(require("./errors"));
// Explicitly import node-fetch v2 using require for CommonJS compatibility
const fetch = require('node-fetch');
/**
 * Using the same signature as `fetch`, makes the network request and returns
 * the response's body as text (decoded using the content-encoding header).
 *
 * Given that this method is used to fetch the response body, it makes two
 * assumptions:
 * 1. Non-200 responses are failures
 * 2. Responses with no body (such as HEAD requests) are failures.
 *
 * @param input – A definition of the resource to fetch.
 * @param init - An object containing options to configure the request.
 *
 * @return The response's body.
 */
const fetchBody = (input, init) => genericFetchBody({ input, init, reader: (response) => response.text() });
exports.fetchBody = fetchBody;
/**
 * Using the same signature as `fetch`, makes the network request and returns
 * the response's body as bytes.
 *
 * Given that this method is used to fetch the response body, it makes two
 * assumptions:
 * 1. Non-200 responses are failures
 * 2. Responses with no body (such as HEAD requests) are failures.
 *
 * @param input – A definition of the resource to fetch.
 * @param init - An object containing options to configure the request.
 *
 * @return The response's body.
 *
 * @see `fetchBody` which decodes the body as text using the `content-encoding`
 *   header.
 */
const fetchBodyAsBytes = (input, init) => genericFetchBody({
    input,
    init,
    reader: (response) => response.arrayBuffer(),
});
exports.fetchBodyAsBytes = fetchBodyAsBytes;
const genericFetchBody = async (args) => {
    const { input, init, reader } = args;
    const maybeResponse = await status.tryCatchAsync(() => fetch(input, init), (error) => status.fromError(errors.createUnknownError(error)));
    if (!status.isOk(maybeResponse)) {
        return maybeResponse;
    }
    const response = maybeResponse.value;
    if (response.status !== 200) {
        return status.fromError(errors.createUnexpectedStatusError({
            expected: 200,
            observed: response.status,
        }));
    }
    if (response.body == null) {
        return status.fromError(errors.createNoContentError());
    }
    return await status.tryCatchAsync(() => reader(response), (error) => status.fromError(errors.createUnknownError(error)));
};
