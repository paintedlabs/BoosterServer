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
const status = __importStar(require("@core/status"));
const time = __importStar(require("./index"));
beforeEach(() => {
    jest.useFakeTimers();
});
describe('doWithRetry', () => {
    it('infinite maxRetries only returns after a success.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockCallback = jest.fn(() => status.fromError('Expected error.'));
        const observer = createPromiseObserver(time.doWithRetry(mockCallback, {
            maxRetries: Infinity,
        }));
        yield drainEventLoop();
        expect(mockCallback.mock.calls.length).toBe(1);
        jest.advanceTimersByTime(1000);
        yield drainEventLoop();
        expect(mockCallback.mock.calls.length).toBe(2);
        jest.advanceTimersByTime(2000);
        yield drainEventLoop();
        expect(mockCallback.mock.calls.length).toBe(3);
        jest.advanceTimersByTime(4000);
        yield drainEventLoop();
        expect(mockCallback.mock.calls.length).toBe(4);
        // Change the mocked function to return a successful status and wait 500ms.
        // Then validate that doWithRetry has returned the successful status.
        mockCallback.mockImplementation(() => status.fromValue('Success!'));
        jest.advanceTimersByTime(8000);
        yield drainEventLoop();
        expect(mockCallback.mock.calls.length).toBe(5);
        expect(observer.state).toStrictEqual({
            resolved: status.fromValue('Success!'),
        });
    }));
    it('will early return an error if max retries is hit.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockCallback = jest.fn(() => status.fromError('Expected error.'));
        const observer = createPromiseObserver(time.doWithRetry(mockCallback, {
            maxRetries: 2,
        }));
        yield drainEventLoop();
        expect(mockCallback.mock.calls.length).toBe(1);
        jest.advanceTimersByTime(1000);
        yield drainEventLoop();
        expect(mockCallback.mock.calls.length).toBe(2);
        jest.advanceTimersByTime(2000);
        yield drainEventLoop();
        expect(mockCallback.mock.calls.length).toBe(3);
        expect(observer.state).toMatchObject({
            resolved: {
                error: 'Expected error.',
            },
        });
    }));
});
const createPromiseObserver = (promise) => {
    let state = null;
    promise.then((value) => {
        state = { resolved: value };
    });
    promise.catch((error) => {
        state = { rejected: error };
    });
    return {
        get state() {
            return state;
        },
    };
};
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
