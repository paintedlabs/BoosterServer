"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUnexpectedStatusError = exports.createNoContentError = exports.createUnknownError = exports.ErrorType = void 0;
var ErrorType;
(function (ErrorType) {
    ErrorType["UNKNOWN"] = "UNKNOWN";
    ErrorType["NO_CONTENT"] = "NO_CONTENT";
    ErrorType["UNEXPECTED_STATUS"] = "UNEXPECTED_STATUS";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
const createUnknownError = (internalDebugContext) => ({
    type: ErrorType.UNKNOWN,
    internalDebugContext: {
        message: internalDebugContext instanceof Error
            ? internalDebugContext.message
            : String(internalDebugContext),
        stack: internalDebugContext instanceof Error
            ? internalDebugContext.stack
            : undefined,
        raw: internalDebugContext,
    },
});
exports.createUnknownError = createUnknownError;
const createNoContentError = () => ({
    type: ErrorType.NO_CONTENT,
});
exports.createNoContentError = createNoContentError;
const createUnexpectedStatusError = (details) => ({
    type: ErrorType.UNEXPECTED_STATUS,
    ...details,
});
exports.createUnexpectedStatusError = createUnexpectedStatusError;
