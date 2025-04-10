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
const time = __importStar(require("@core/time"));
const concurrency = __importStar(require("./index"));
describe('Mutex', () => {
    it('Single lock acquisition and release succeeds.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createMutex();
        const lock = yield mutex.acquireLock();
        expect(lock.release()).toBe(true);
    }));
    it('Sequential lock acquisition and release succeeds.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createMutex();
        const firstLock = yield mutex.acquireLock();
        expect(firstLock.release()).toBe(true);
        const secondLock = yield mutex.acquireLock();
        expect(secondLock.release()).toBe(true);
    }));
    it('Non-active locks may not release the mutex.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createMutex();
        const firstLock = yield mutex.acquireLock();
        expect(firstLock.release()).toBe(true);
        const secondLock = yield mutex.acquireLock();
        expect(firstLock.release()).toBe(false);
        expect(firstLock.release()).toBe(false);
        expect(mutex.acquireLockImmediate()).toBe(null);
        expect(secondLock.release()).toBe(true);
    }));
    it('denies additional locks until release.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createMutex();
        const lock = yield mutex.acquireLockImmediate();
        expect(lock).not.toBe(null);
        expect(mutex.acquireLockImmediate()).toBe(null);
        expect(mutex.acquireLockImmediate()).toBe(null);
        expect(mutex.acquireLockImmediate()).toBe(null);
        expect(lock === null || lock === void 0 ? void 0 : lock.release()).toBe(true);
        expect(mutex.acquireLockImmediate()).not.toBe(null);
    }));
    it('Different mutexes are not exclusive.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutexFoo = concurrency.createMutex();
        const mutexBar = concurrency.createMutex();
        const lockFoo = yield mutexFoo.acquireLock();
        const lockBar = yield mutexBar.acquireLock();
        expect(lockFoo.release()).toBe(true);
        expect(lockBar.release()).toBe(true);
    }));
    it('Contexts are woken up in FIFO order.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createMutex();
        const startLatch = yield mutex.acquireLock();
        const results = [];
        const runners = [
            mutex.runExclusive(() => {
                results.push(1);
            }),
            mutex.runExclusive(() => {
                expect(results).toStrictEqual([1]);
                results.push(2);
            }),
            mutex.runExclusive(() => {
                expect(results).toStrictEqual([1, 2]);
                results.push(3);
            }),
        ];
        expect(results).toStrictEqual([]);
        startLatch.release();
        yield Promise.all(runners);
        expect(results).toStrictEqual([1, 2, 3]);
    }));
    it('runExclusive executes tasks exclusively.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createMutex();
        let activeTask = 0;
        const simulateAsyncTask = (returnValue) => mutex.runExclusive(() => __awaiter(void 0, void 0, void 0, function* () {
            // Ensure no other task is running.
            expect(activeTask).toBe(0);
            ++activeTask;
            // Wait a random number of milliseconds to simulate real workloads.
            yield time.sleep({ milliseconds: Math.random() * 100 });
            // Ensure the task is still the only one active.
            expect(activeTask).toBe(1);
            --activeTask;
            return returnValue;
        }));
        // Initiate multiple concurrent tasks.
        const tasks = Promise.all([1, 2, 3, 4, 5].map((id) => simulateAsyncTask(id)));
        // Wait for all tasks to complete.
        yield expect(tasks).resolves.toStrictEqual([1, 2, 3, 4, 5]);
    }));
    it('Handles high contention without race conditions.', () => __awaiter(void 0, void 0, void 0, function* () {
        /// It's hard to test for race conditions deterministically. So instead we
        /// attempt to overwhelm the mutex with a common scenario: many concurrent
        /// lock acquisition requests which all read state, wait, and then write to
        /// state. Without a mutex, this is ensured to create malformed state. With
        /// a mutex is should never create malformed state.
        const mutex = concurrency.createMutex();
        let sharedState = 0;
        const updateSharedState = () => __awaiter(void 0, void 0, void 0, function* () {
            const lock = yield mutex.acquireLock();
            const currentState = sharedState;
            yield time.sleep({ milliseconds: Math.random() * 10 });
            sharedState = currentState + 1;
            lock.release();
        });
        const tasks = [];
        for (let i = 0; i < 1000; i++) {
            tasks.push(updateSharedState());
        }
        yield Promise.all(tasks);
        // The shared state should reflect atomic increments if the mutex is working
        // correctly. If the mutex has misbehaved, it will be less than 1000 as a
        // result of state being overwitten due to overlapping lock acquisitions.
        expect(sharedState).toBe(1000);
    }), 15000);
    it('runExclusive releases when unexpected errors occur.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createMutex();
        yield expect(mutex.runExclusive(() => {
            throw new Error('Expected Error');
        })).rejects.toThrow(Error);
        // Desite the previous `runExclusive` call being interrupted by an error,
        // the mutex is released as indicated by our ability to re-acquire a lock.
        expect(yield mutex.runExclusive(() => 100)).toBe(100);
    }));
});
