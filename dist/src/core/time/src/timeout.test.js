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
const status = __importStar(require("@core/status"));
const time = __importStar(require("./index"));
beforeEach(() => {
    jest.useFakeTimers();
});
describe('doWithTimeout', () => {
    it('returns the callback result when it resolves before the time.', async () => {
        const result = time.doWithTimeout({
            callback: async () => {
                await time.sleep({ seconds: 0.5 });
                return 100;
            },
            timeout: { seconds: 1 },
        });
        jest.advanceTimersByTime(500);
        await drainEventLoop();
        expect(status.throwIfError(await result)).toStrictEqual(100);
    });
    it('returns error when a callback times out.', async () => {
        const result = time.doWithTimeout({
            callback: async () => {
                await time.sleep({ seconds: 2 });
                return 100;
            },
            timeout: { seconds: 1 },
        });
        jest.advanceTimersByTime(1000);
        await drainEventLoop();
        expect(await result).toMatchObject({
            error: {
                type: time.TIMEOUT_ERROR_TYPE,
            },
        });
    });
    it('triggers the abort signal when a timeout occurs.', async () => {
        let hoistedAbortSignal;
        const result = time.doWithTimeout({
            callback: async (abortSignal) => {
                hoistedAbortSignal = abortSignal;
                await time.sleep({ seconds: 2 });
                return 100;
            },
            timeout: { seconds: 1 },
        });
        jest.advanceTimersByTime(1000);
        await drainEventLoop();
        expect(await result).toMatchObject({
            error: {
                type: time.TIMEOUT_ERROR_TYPE,
            },
        });
        expect(hoistedAbortSignal.aborted).toBe(true);
    });
    it('does not trigger the abort signal when the callback returns in time.', async () => {
        let hoistedAbortSignal;
        const result = time.doWithTimeout({
            callback: (abortSignal) => {
                hoistedAbortSignal = abortSignal;
                return 100;
            },
            timeout: { seconds: 1 },
        });
        await drainEventLoop();
        expect(status.throwIfError(await result)).toStrictEqual(100);
        expect(hoistedAbortSignal.aborted).toBe(false);
    });
});
/**
 * It's often necessary when writing tests which mock time, to advance time
 * *and* allow the event loop to resolve any outstanding promises.
 *
 * For example
 *
 * ```ts
 * await sleep({ seconds: 1 });
 * console.log(100);
 * ```
 *
 * Just stepping forward one second wont emit a log statement, the resolved
 * sleep command will be in the event queue and we need to yield control to it
 * in order to log.
 *
 * To achieve this, we have this helper which enforces a 1000 event loop cycles
 * to complete, offering plenty of time for promises to resolve.
 */
const drainEventLoop = async () => {
    for (let i = 0; i < 1000; ++i)
        await Promise.resolve();
};
