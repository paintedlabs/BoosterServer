"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSystemError = exports.SystemErrorCode = exports.createUnknownError = exports.ErrorType = void 0;
var ErrorType;
(function (ErrorType) {
    ErrorType["UNKNOWN"] = "UNKNOWN";
    ErrorType["SYSTEM"] = "SYSTEM";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
const createUnknownError = (internalDebugContext) => ({
    type: ErrorType.UNKNOWN,
    internalDebugContext,
});
exports.createUnknownError = createUnknownError;
var SystemErrorCode;
(function (SystemErrorCode) {
    SystemErrorCode["EACCES"] = "EACCES";
    SystemErrorCode["EEXIST"] = "EEXIST";
    SystemErrorCode["EISDIR"] = "EISDIR";
    SystemErrorCode["EMFILE"] = "EMFILE";
    SystemErrorCode["ENOENT"] = "ENOENT";
    SystemErrorCode["ENOTDIR"] = "ENOTDIR";
    SystemErrorCode["ENOTEMPTY"] = "ENOTEMPTY";
    SystemErrorCode["EPERM"] = "EPERM";
})(SystemErrorCode || (exports.SystemErrorCode = SystemErrorCode = {}));
const createSystemError = (details) => (Object.assign({ type: ErrorType.SYSTEM }, details));
exports.createSystemError = createSystemError;
