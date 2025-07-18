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
exports.retryUntilSuccessful = exports.doWithRetry = void 0;
const status = __importStar(require("@core/status"));
const duration = __importStar(require("./duration"));
const sleep = __importStar(require("./sleep"));
/**
 * Executes the provided operation and retries failures.
 *
 * Uses exponential backoff with full jitter as out lined here:
 * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @param operation - The operation to execute.
 * @param options - Retry options.
 *
 * @returns The operation response. It may be an error if `maxRetries` has been
 *   hit and the last recorded operation execution was an error.
 */
const doWithRetry = async (operation, options) => {
    const optionsWithDefaults = {
        maxRetries: Infinity,
        factor: 2,
        base: { milliseconds: 1000 },
        maxTimeout: { milliseconds: Infinity },
        ...options,
    };
    let operationResult = await operation();
    let retries = 0;
    while (!status.isOk(operationResult) &&
        retries < optionsWithDefaults.maxRetries) {
        await delay(retries++, optionsWithDefaults);
        operationResult = await operation();
    }
    return operationResult;
};
exports.doWithRetry = doWithRetry;
/**
 * Executes the provided operation until it responds with a successful status.
 *
 * Uses exponential backoff with full jitter as outlined here:
 * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @param operation - The operation to execute.
 * @param options - Retry options.
 *
 * @returns The successful operation response.
 */
const retryUntilSuccessful = async (operation, options) => 
// This "throwIfError" should NEVER throw an error because maxRetries is set
// to Infinity. We're using it here to forceably unwrap the StatusOr.
status.throwIfError(await (0, exports.doWithRetry)(operation, {
    maxRetries: Infinity,
    ...options,
}));
exports.retryUntilSuccessful = retryUntilSuccessful;
/**
 * Given a number of retries and retry options, returns a promise which will
 * resolve after exponential backoff has been applied between the last retry and
 * the next.
 *
 * Uses exponential backoff with full jitter as out lined here:
 * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @param retries - The number of retries already attempted.
 * @param options - Retry options.
 *
 * @returns A promise which will resolve after backoff has been applied.
 */
const delay = async (retries, options) => {
    const exponentialBackoff = duration.toMilliseconds(options.base) * Math.pow(options.factor, retries);
    const withCap = Math.min(duration.toMilliseconds(options.maxTimeout), exponentialBackoff);
    const withFullJitter = Math.random() * withCap;
    await sleep.sleep({ milliseconds: withFullJitter });
};
