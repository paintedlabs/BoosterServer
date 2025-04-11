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
exports.sleepUntil = exports.sleep = void 0;
const duration = __importStar(require("./duration"));
/**
 * Returns a promise which resolves after the provided duration has passed.
 *
 * Useful for replicating `sleep`-like behavior in async methods like so:
 *
 * ```ts
 * await sleep({ seconds: 0.5 });
 * ```
 *
 * @param delay - The delay to wait for.
 * @param options - Sleep options.
 *
 * @returns A promise which will resolve after `delay`.
 */
const sleep = (delay, options) => {
    var _a;
    if ((_a = options === null || options === void 0 ? void 0 : options.abortSignal) === null || _a === void 0 ? void 0 : _a.aborted) {
        return Promise.resolve({ cancelled: true });
    }
    const delayMs = duration.toMilliseconds(delay);
    if (delayMs <= 0) {
        return Promise.resolve({ cancelled: false });
    }
    return new Promise((resolve) => {
        const onAbort = () => {
            resolve({ cancelled: true });
            clearTimeout(timeout);
        };
        if ((options === null || options === void 0 ? void 0 : options.abortSignal) != null) {
            options.abortSignal.addEventListener('abort', onAbort);
        }
        const timeout = setTimeout(() => {
            var _a;
            (_a = options === null || options === void 0 ? void 0 : options.abortSignal) === null || _a === void 0 ? void 0 : _a.removeEventListener('abort', onAbort);
            resolve({ cancelled: false });
        }, delayMs);
    });
};
exports.sleep = sleep;
/**
 * Returns a promise which resolves on or after the provided date.
 *
 * Useful for replicating `sleep`-like behaviors in async methods like so.
 *
 * ```ts
 * await sleepUntil(futureDate);
 * ```
 *
 * @param date - The date to sleep until.
 * @param options - Sleep options.
 *
 * @returns A promise which will resolve on or after `date`.
 */
const sleepUntil = (date, options) => (0, exports.sleep)({ milliseconds: Date.now() - date.getTime() }, options);
exports.sleepUntil = sleepUntil;
