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
exports.rewriteIfError = exports.rewriteError = void 0;
const statusOr = __importStar(require("./StatusOr"));
/**
 * Given an `ErrorStatusOr`, returns a copy with a rewritten "error" field,
 * preserving all other properties (e.g. `traceback` and `retriable`).
 *
 * This is useful when clients need to transform the shape or content of an
 * error without altering its intrinsic attributes.
 *
 * @param errorStatusOr - The `ErrorStatusOr` which will be mapped.
 * @param mapper - A function which transforms the original `error` field.
 *
 * @returns A new `ErrorStatusOr` with a rewritten "error" field.
 */
const rewriteError = (errorStatusOr, mapper) => ({
    __typename: errorStatusOr.__typename,
    error: mapper(errorStatusOr.error),
    retriable: errorStatusOr.retriable,
    changelog: [
        ...errorStatusOr.changelog,
        {
            type: statusOr.ChangeEventType.REWRITE,
            rewrittenError: errorStatusOr.error,
        },
    ],
    // `ErrorStatusOr.traceback` is lazily evaluated for performance, so it's
    // critical that we maintain lazy evaluation when copying the error.
    get traceback() {
        return errorStatusOr.traceback;
    },
});
exports.rewriteError = rewriteError;
const rewriteIfError = (status, mapper) => {
    if (statusOr.isOk(status)) {
        return status;
    }
    return (0, exports.rewriteError)(status, mapper);
};
exports.rewriteIfError = rewriteIfError;
