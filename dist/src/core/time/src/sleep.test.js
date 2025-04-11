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
const time = __importStar(require("./index"));
beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    jest.spyOn(global, 'clearTimeout');
});
describe('sleep', () => {
    it('resolves after the designated duration.', () => __awaiter(void 0, void 0, void 0, function* () {
        let sleepResult = null;
        time.sleep({ seconds: 5 }).then((resolvedSleepResult) => {
            sleepResult = resolvedSleepResult;
        });
        jest.advanceTimersByTime(4999);
        yield drainEventLoop();
        expect(sleepResult).toBe(null);
        jest.advanceTimersByTime(5000);
        yield drainEventLoop();
        expect(sleepResult).toStrictEqual({ cancelled: false });
    }));
    it('can be cancelled before the desired duration.', () => __awaiter(void 0, void 0, void 0, function* () {
        const abortController = new AbortController();
        let sleepResult = null;
        time
            .sleep({ seconds: 5 }, { abortSignal: abortController.signal })
            .then((resolvedSleepResult) => {
            sleepResult = resolvedSleepResult;
        });
        jest.advanceTimersByTime(2000);
        yield drainEventLoop();
        expect(sleepResult).toBe(null);
        abortController.abort();
        yield drainEventLoop();
        expect(sleepResult).toStrictEqual({ cancelled: true });
    }));
    it('clears all timers when cancelled.', () => __awaiter(void 0, void 0, void 0, function* () {
        expect(jest.getTimerCount()).toBe(0);
        const abortController = new AbortController();
        time.sleep({ seconds: 5 }, { abortSignal: abortController.signal });
        expect(jest.getTimerCount()).toBe(1);
        abortController.abort();
        yield drainEventLoop();
        expect(jest.getTimerCount()).toBe(0);
    }));
    it('cancellation after the desired duration does nothing.', () => __awaiter(void 0, void 0, void 0, function* () {
        const abortController = new AbortController();
        let sleepResult = null;
        time
            .sleep({ seconds: 5 }, { abortSignal: abortController.signal })
            .then((resolvedSleepResult) => {
            sleepResult = resolvedSleepResult;
        });
        jest.advanceTimersByTime(5000);
        yield drainEventLoop();
        expect(sleepResult).toStrictEqual({ cancelled: false });
        abortController.abort();
        yield drainEventLoop();
        expect(sleepResult).toStrictEqual({ cancelled: false });
    }));
    it('does not clear any timers when cancelled after completion.', () => __awaiter(void 0, void 0, void 0, function* () {
        expect(jest.getTimerCount()).toBe(0);
        const abortController = new AbortController();
        time.sleep({ seconds: 5 }, { abortSignal: abortController.signal });
        expect(jest.getTimerCount()).toBe(1);
        jest.advanceTimersByTime(5000);
        yield drainEventLoop();
        expect(jest.getTimerCount()).toBe(0);
        abortController.abort();
        yield drainEventLoop();
        expect(jest.getTimerCount()).toBe(0);
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).toHaveBeenCalledTimes(0);
    }));
    it('resolves immediately when the delay is zero.', () => __awaiter(void 0, void 0, void 0, function* () {
        expect(yield time.sleep({ seconds: 0 })).toStrictEqual({
            cancelled: false,
        });
    }));
    it('resolves immediately when the delay is negative.', () => __awaiter(void 0, void 0, void 0, function* () {
        expect(yield time.sleep({ seconds: -1 })).toStrictEqual({
            cancelled: false,
        });
    }));
    it('resolves immediately when the abort signal is already aborted.', () => __awaiter(void 0, void 0, void 0, function* () {
        const abortController = new AbortController();
        abortController.abort();
        expect(yield time.sleep({ seconds: 5 }, { abortSignal: abortController.signal })).toStrictEqual({ cancelled: true });
        expect(yield time.sleep({ seconds: -1 }, { abortSignal: abortController.signal })).toStrictEqual({ cancelled: true });
    }));
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
const drainEventLoop = () => __awaiter(void 0, void 0, void 0, function* () {
    for (let i = 0; i < 1000; ++i)
        yield Promise.resolve();
});
