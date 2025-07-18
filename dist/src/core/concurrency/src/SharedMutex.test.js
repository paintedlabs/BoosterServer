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
const concurrency = __importStar(require("./index"));
describe('SharedMutex', () => {
    it('can acquire and release a shared lock.', async () => {
        const mutex = concurrency.createSharedMutex();
        const lock = await mutex.acquireSharedLock();
        expect(lock.shared).toBe(true);
        expect(lock.release()).toBe(true);
    });
    it('can acquire and release a exclusive lock.', async () => {
        const mutex = concurrency.createSharedMutex();
        const lock = await mutex.acquireExclusiveLock();
        expect(lock.shared).toBe(false);
        expect(lock.release()).toBe(true);
    });
    it('can sequentially acquire and release shared locks.', async () => {
        const mutex = concurrency.createSharedMutex();
        const firstLock = await mutex.acquireSharedLock();
        expect(firstLock.release()).toBe(true);
        const secondLock = await mutex.acquireSharedLock();
        expect(secondLock.release()).toBe(true);
    });
    it('can sequentially acquire and release exclusive locks.', async () => {
        const mutex = concurrency.createSharedMutex();
        const firstLock = await mutex.acquireExclusiveLock();
        expect(firstLock.release()).toBe(true);
        const secondLock = await mutex.acquireExclusiveLock();
        expect(secondLock.release()).toBe(true);
    });
    it('prevents non-active shared locks from releasing the mutex.', async () => {
        const mutex = concurrency.createSharedMutex();
        const firstLock = await mutex.acquireSharedLock();
        expect(firstLock.release()).toBe(true);
        const secondLock = await mutex.acquireSharedLock();
        expect(firstLock.release()).toBe(false);
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        expect(secondLock.release()).toBe(true);
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
    });
    it('prevents non-active exclusive locks from releasing the mutex.', async () => {
        const mutex = concurrency.createSharedMutex();
        const firstLock = await mutex.acquireExclusiveLock();
        expect(firstLock.release()).toBe(true);
        const secondLock = await mutex.acquireSharedLock();
        expect(firstLock.release()).toBe(false);
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        expect(secondLock.release()).toBe(true);
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
    });
    it('allows multiple shared locks to be acquired concurrently.', async () => {
        const mutex = concurrency.createSharedMutex();
        expect(mutex.acquireSharedLockImmediate()).not.toBe(null);
        expect(mutex.acquireSharedLockImmediate()).not.toBe(null);
        expect(mutex.acquireSharedLockImmediate()).not.toBe(null);
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
    });
    it('requires all shared locks to release before accepting exclusive lock.', async () => {
        const mutex = concurrency.createSharedMutex();
        const firstLock = await mutex.acquireSharedLock();
        const secondLock = await mutex.acquireSharedLock();
        const thirdLock = await mutex.acquireSharedLock();
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        firstLock.release();
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        thirdLock.release();
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        secondLock.release();
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
    });
    it('prevents any lock acquisition while in exclusive mode.', async () => {
        const mutex = concurrency.createSharedMutex();
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        expect(mutex.acquireSharedLockImmediate()).toBe(null);
        expect(mutex.acquireSharedLockImmediate()).toBe(null);
    });
    it('denies exclusive lock while shared locks are held.', async () => {
        const mutex = concurrency.createSharedMutex();
        const sharedLock = await mutex.acquireSharedLock();
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
        expect(sharedLock.release()).toBe(true);
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
    });
    it('denies shared lock while exclusive lock is held.', async () => {
        const mutex = concurrency.createSharedMutex();
        const exclusiveLock = await mutex.acquireExclusiveLock();
        expect(mutex.acquireSharedLockImmediate()).toBe(null);
        expect(exclusiveLock.release()).toBe(true);
        expect(mutex.acquireSharedLockImmediate()).not.toBe(null);
    });
    it('concurrently executes runShared calls.', async () => {
        const mutex = concurrency.createSharedMutex();
        const firstFence = concurrency.createDeferred();
        const secondFence = concurrency.createDeferred();
        const data = [];
        await Promise.all([
            mutex.runShared(async () => {
                await firstFence.promise;
                data.push(100);
            }),
            mutex.runShared(() => {
                data.push(200);
                firstFence.resolve();
            }),
            mutex.runExclusive(() => data.push(300)),
            mutex.runShared(async () => {
                await secondFence.promise;
                data.push(400);
            }),
            mutex.runShared(() => {
                data.push(500);
                secondFence.resolve();
            }),
        ]);
        expect(data).toStrictEqual([200, 100, 300, 500, 400]);
    });
    it('prevents shared locks from starving exclusive locks.', async () => {
        const mutex = concurrency.createSharedMutex();
        const data = [];
        await Promise.all([
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
    });
    it('prevents exclusive locks from starving shared locks.', async () => {
        const mutex = concurrency.createSharedMutex();
        const data = [];
        await Promise.all([
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
    });
    it('releases the lock when runShared experiences an error.', async () => {
        const mutex = concurrency.createSharedMutex();
        await expect(mutex.runShared(() => {
            throw new Error('Expected Error');
        })).rejects.toThrow(Error);
        // Desite the previous `runShared` call being interrupted by an error, the
        // mutex is released as indicated by our ability to re-acquire a lock.
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
    });
    it('releases the lock when runExclusive experiences an error.', async () => {
        const mutex = concurrency.createSharedMutex();
        await expect(mutex.runExclusive(() => {
            throw new Error('Expected Error');
        })).rejects.toThrow(Error);
        // Desite the previous `runExclusive` call being interrupted by an error,
        // the mutex is released as indicated by our ability to re-acquire a lock.
        expect(mutex.acquireExclusiveLockImmediate()).not.toBe(null);
    });
    it('disallows immediate exclusive locks after shared contexts are activated.', async () => {
        const mutex = concurrency.createSharedMutex();
        const firstLock = await mutex.acquireExclusiveLock();
        const secondLockFuture = mutex.acquireSharedLock();
        expect(firstLock.release()).toBe(true);
        await secondLockFuture;
        expect(mutex.acquireExclusiveLockImmediate()).toBe(null);
    });
    it('disallows immediate shared locks after shared contexts are activated and an exclusive lock is waiting.', async () => {
        const mutex = concurrency.createSharedMutex();
        const firstLock = await mutex.acquireExclusiveLock();
        const secondLockFuture = mutex.acquireSharedLock();
        mutex.acquireExclusiveLock();
        expect(firstLock.release()).toBe(true);
        await secondLockFuture;
        expect(mutex.acquireSharedLockImmediate()).toBe(null);
    });
});
