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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimeoutError = exports.TIMEOUT_ERROR_TYPE = exports.doWithTimeout = void 0;
const status = __importStar(require("@core/status"));
const sleep = __importStar(require("./sleep"));
/**
 * Executes the provided callback and if no result is returned by the provided
 * duration, aborts the callback and returns a timeout error.
 *
 * This is typically used to enforce constraints on a long-running task. For
 * example:
 *
 * ```ts
 * const maybeSocket = await doWithTimeout({
 *   callback: () => connectSocket(),
 *   timeout: { seconds: 5 },
 * });
 * ```
 *
 * @param args -
 * @param args.callback - The callback to execute.
 * @param args.timeout - The duration to wait before canceling the callback.
 *
 * @returns The result of your callback, or an error if it timed out.
 */
const doWithTimeout = (args) => __awaiter(void 0, void 0, void 0, function* () {
    const { callback, timeout } = args;
    const sleepAbortController = new AbortController();
    const callbackAbortController = new AbortController();
    const COMPLETED_TIMER = Symbol();
    const waitUntilTimeout = () => __awaiter(void 0, void 0, void 0, function* () {
        yield sleep.sleep(timeout, { abortSignal: sleepAbortController.signal });
        return COMPLETED_TIMER;
    });
    const result = yield Promise.race([
        waitUntilTimeout(),
        callback(callbackAbortController.signal),
    ]);
    if (result === COMPLETED_TIMER) {
        callbackAbortController.abort();
        return status.fromError((0, exports.createTimeoutError)({ timeout }));
    }
    sleepAbortController.abort();
    return status.fromValue(result);
});
exports.doWithTimeout = doWithTimeout;
exports.TIMEOUT_ERROR_TYPE = Symbol('TimeoutError');
const createTimeoutError = (details) => (Object.assign({ type: exports.TIMEOUT_ERROR_TYPE }, details));
exports.createTimeoutError = createTimeoutError;
