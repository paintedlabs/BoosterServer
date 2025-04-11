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
exports.graftValue = exports.stripValue = exports.okStatus = exports.OK_VALUE = void 0;
const statusOrModule = __importStar(require("./StatusOr"));
// `Status` is a specialization of `StatusOr` with no assignable value. It's
// useful in cases where a method wants to return a Status but has no return
// value on success.
exports.OK_VALUE = 'Status{THIS_MUST_BE_UNIQUE_AND_SERIALIZABLE}';
const okStatus = () => statusOrModule.fromValue(exports.OK_VALUE);
exports.okStatus = okStatus;
const stripValue = (statusOr) => {
    if (statusOrModule.isOk(statusOr)) {
        return (0, exports.okStatus)();
    }
    return statusOr;
};
exports.stripValue = stripValue;
/**
 * Allows clients to graft a value onto an "OK" `Status`. If the provided status
 * is not "OK", the error will be copied as the relevant `StatusOr<T>`.
 *
 * @param status The status maybe receiving a new value.
 * @param value The value to graft.
 *
 * @returns `StatusOr<T>` the grafted StatusOr.
 */
const graftValue = (status, value) => {
    if (!statusOrModule.isOk(status)) {
        return status;
    }
    return statusOrModule.fromValue(value);
};
exports.graftValue = graftValue;
