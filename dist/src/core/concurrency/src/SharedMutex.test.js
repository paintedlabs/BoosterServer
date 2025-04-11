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
const concurrency = __importStar(require("./index"));
describe('SharedMutex', () => {
    it('can acquire and release a shared lock.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const lock = yield mutex.acquireSharedLock();
        expect(lock.shared).toBe(true);
        expect(lock.release()).toBe(true);
    }));
    it('can acquire and release a exclusive lock.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const lock = yield mutex.acquireExclusiveLock();
        expect(lock.shared).toBe(false);
        expect(lock.release()).toBe(true);
    }));
    it('can sequentially acquire and release shared locks.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const firstLock = yield mutex.acquireSharedLock();
        expect(firstLock.release()).toBe(true);
        const secondLock = yield mutex.acquireSharedLock();
        expect(secondLock.release()).toBe(true);
    }));
    it('can sequentially acquire and release exclusive locks.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const firstLock = yield mutex.acquireExclusiveLock();
        expect(firstLock.release()).toBe(true);
        const secondLock = yield mutex.acquireExclusiveLock();
        expect(secondLock.release()).toBe(true);
    }));
    it('prevents non-active shared locks from releasing the mutex.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const firstLock = yield mutex.acquireSharedLock();
        expect(firstLock.release()).toBe(true);
        const secondLock = yield mutex.acquireSharedLock();
        expect(firstLock.release()).toBe(false);
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        expect(secondLock.release()).toBe(true);
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
    }));
    it('prevents non-active exclusive locks from releasing the mutex.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const firstLock = yield mutex.acquireExclusiveLock();
        expect(firstLock.release()).toBe(true);
        const secondLock = yield mutex.acquireSharedLock();
        expect(firstLock.release()).toBe(false);
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        expect(secondLock.release()).toBe(true);
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
    }));
    it('allows multiple shared locks to be acquired concurrently.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        expect(mutex.acquireSharedLockImmediate()).not.toBe(null);
        expect(mutex.acquireSharedLockImmediate()).not.toBe(null);
        expect(mutex.acquireSharedLockImmediate()).not.toBe(null);
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
    }));
    it('requires all shared locks to release before accepting exclusive lock.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const firstLock = yield mutex.acquireSharedLock();
        const secondLock = yield mutex.acquireSharedLock();
        const thirdLock = yield mutex.acquireSharedLock();
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        firstLock.release();
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        thirdLock.release();
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        secondLock.release();
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
    }));
    it('prevents any lock acquisition while in exclusive mode.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        expect(mutex.acquireSharedLockImmediate()).toBe(null);
        expect(mutex.acquireSharedLockImmediate()).toBe(null);
    }));
    it('denies exclusive lock while shared locks are held.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const sharedLock = yield mutex.acquireSharedLock();
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        expect(sharedLock.release()).toBe(true);
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
    }));
    it('denies shared lock while exclusive lock is held.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const exclusiveLock = yield mutex.acquireExclusiveLock();
        expect(mutex.acquireSharedLockImmediate()).toBe(null);
        expect(exclusiveLock.release()).toBe(true);
        expect(mutex.acquireSharedLockImmediate()).not.toBe(null);
    }));
    it('concurrently executes runShared calls.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const firstFence = concurrency.createDeferred();
        const secondFence = concurrency.createDeferred();
        const data = [];
        yield Promise.all([
            mutex.runShared(() => __awaiter(void 0, void 0, void 0, function* () {
                yield firstFence.promise;
                data.push(100);
            })),
            mutex.runShared(() => {
                data.push(200);
                firstFence.resolve();
            }),
            mutex.runExclusive(() => data.push(300)),
            mutex.runShared(() => __awaiter(void 0, void 0, void 0, function* () {
                yield secondFence.promise;
                data.push(400);
            })),
            mutex.runShared(() => {
                data.push(500);
                secondFence.resolve();
            }),
        ]);
        expect(data).toStrictEqual([200, 100, 300, 500, 400]);
    }));
    it('prevents shared locks from starving exclusive locks.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const data = [];
        yield Promise.all([
            mutex.runShared(() => data.push(100)),
            mutex.runShared(() => data.push(200)),
            mutex.runExclusive(() => data.push(300)),
            mutex.runShared(() => data.push(400)),
            mutex.runShared(() => data.push(500)),
            mutex.runExclusive(() => data.push(600)),
            mutex.runShared(() => data.push(700)),
            mutex.runShared(() => data.push(800)),
        ]);
        expect(data).toStrictEqual([100, 200, 300, 400, 500, 600, 700, 800]);
    }));
    it('prevents exclusive locks from starving shared locks.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const data = [];
        yield Promise.all([
            mutex.runExclusive(() => data.push(100)),
            mutex.runExclusive(() => data.push(200)),
            mutex.runShared(() => data.push(300)),
            mutex.runExclusive(() => data.push(400)),
            mutex.runExclusive(() => data.push(500)),
            mutex.runShared(() => data.push(600)),
            mutex.runExclusive(() => data.push(700)),
            mutex.runExclusive(() => data.push(800)),
        ]);
        expect(data).toStrictEqual([100, 200, 300, 400, 500, 600, 700, 800]);
    }));
    it('releases the lock when runShared experiences an error.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        yield expect(mutex.runShared(() => {
            throw new Error('Expected Error');
        })).rejects.toThrow(Error);
        // Desite the previous `runShared` call being interrupted by an error, the
        // mutex is released as indicated by our ability to re-acquire a lock.
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
    }));
    it('releases the lock when runExclusive experiences an error.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        yield expect(mutex.runExclusive(() => {
            throw new Error('Expected Error');
        })).rejects.toThrow(Error);
        // Desite the previous `runExclusive` call being interrupted by an error,
        // the mutex is released as indicated by our ability to re-acquire a lock.
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
    }));
    it('disallows immediate exclusive locks after shared contexts are activated.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const firstLock = yield mutex.acquireExclusiveLock();
        const secondLockFuture = mutex.acquireSharedLock();
        expect(firstLock.release()).toBe(true);
        yield secondLockFuture;
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
    }));
    it('disallows immediate shared locks after shared contexts are activated and an exclusive lock is waiting.', () => __awaiter(void 0, void 0, void 0, function* () {
        const mutex = concurrency.createSharedMutex();
        const firstLock = yield mutex.acquireExclusiveLock();
        const secondLockFuture = mutex.acquireSharedLock();
        mutex.acquireExclusiveLock();
        expect(firstLock.release()).toBe(true);
        yield secondLockFuture;
        expect(mutex.acquireSharedLockImmediate()).toBe(null);
    }));
});
