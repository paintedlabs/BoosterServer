"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSharedMutex = void 0;
/**
 * Creates and returns a new `SharedMutex` instance, which can be used to
 * control access to a shared resource.
 *
 * @returns A new `SharedMutex` instance.
 */
const createSharedMutex = () => {
    // The mode governs when the `SharedMutex` is permitted to create different
    // kinds of locks. See `SharedMutexMode` for more details.
    let mode = SharedMutexMode.FREE;
    // A FIFO queue of async contexts waiting for a lock.
    const waitingContexts = [];
    // Locks which are currently leased out, waiting for release.
    const activeLocks = new Set();
    const createLock = (args) => {
        const { shared } = args;
        const lock = {
            get shared() {
                return shared;
            },
            release: () => {
                if (!activeLocks.delete(lock)) {
                    return false;
                }
                if (activeLocks.size === 0) {
                    mode = SharedMutexMode.FREE;
                    activeNextContext();
                }
                return true;
            },
        };
        activeLocks.add(lock);
        return lock;
    };
    const activeNextContext = () => {
        if (mode !== SharedMutexMode.FREE || waitingContexts.length === 0) {
            return;
        }
        // If the first waiting context is exclusive, we simply activate it.
        if (!waitingContexts[0].shared) {
            mode = SharedMutexMode.EXCLUSIVE;
            waitingContexts[0].activate();
            waitingContexts.shift();
            return;
        }
        // If the first waiting context is shared, then we must activate all shared
        // contexts until we encounter an exclusive context.
        while (waitingContexts.length > 0 && waitingContexts[0].shared) {
            waitingContexts[0].activate();
            waitingContexts.shift();
        }
        // Once we've finished activating shared contexts, we should be in one of
        // two scenarios:
        //
        // 1. We've activated every waiting context.
        // 2. We stopped activating shared contexts because we're waiting on an
        //    exclusive context.
        //
        // If (2) has occured, we need to switch the mutex into `EXCLUSIVE` mode to
        // prevent additional calls to `acquireShared` from starving the waiting
        // exclusive context.
        mode =
            waitingContexts.length > 0
                ? SharedMutexMode.EXCLUSIVE
                : SharedMutexMode.SHARED;
    };
    const runShared = async (runner) => {
        const lock = await acquireSharedLock();
        try {
            return await runner();
        }
        finally {
            lock.release();
        }
    };
    const runExclusive = async (runner) => {
        const lock = await acquireExclusiveLock();
        try {
            return await runner();
        }
        finally {
            lock.release();
        }
    };
    const acquireSharedLock = () => {
        const lock = acquireSharedLockImmediate();
        if (lock != null) {
            return lock;
        }
        return new Promise((resolve) => {
            waitingContexts.push({
                shared: true,
                activate: () => {
                    resolve(createLock({ shared: true }));
                },
            });
        });
    };
    const acquireExclusiveLock = () => {
        const lock = acquireExclusiveLockImmediate();
        if (lock != null) {
            return lock;
        }
        // It's important that we transition to exclusive mode so that additional
        // shared locks must be created *after* the exclusive lock resolves,
        // preventing shared locks from starving exclusive locks.
        mode = SharedMutexMode.EXCLUSIVE;
        return new Promise((resolve) => {
            waitingContexts.push({
                shared: false,
                activate: () => {
                    resolve(createLock({ shared: false }));
                },
            });
        });
    };
    const acquireSharedLockImmediate = () => {
        switch (mode) {
            case SharedMutexMode.FREE:
            case SharedMutexMode.SHARED: {
                mode = SharedMutexMode.SHARED;
                return createLock({ shared: true });
            }
            case SharedMutexMode.EXCLUSIVE:
                return null;
        }
    };
    const acquireExclusiveLockImmediate = () => {
        switch (mode) {
            case SharedMutexMode.FREE: {
                mode = SharedMutexMode.EXCLUSIVE;
                return createLock({ shared: false });
            }
            case SharedMutexMode.SHARED:
            case SharedMutexMode.EXCLUSIVE:
                return null;
        }
    };
    return {
        runShared,
        runExclusive,
        acquireSharedLock,
        acquireExclusiveLock,
        acquireSharedLockImmediate,
        acquireExclusiveLockImmediate,
    };
};
exports.createSharedMutex = createSharedMutex;
var SharedMutexMode;
(function (SharedMutexMode) {
    // Indicates that no locks are currently held, allowing the `SharedMutex` to
    // mint any kind of lock.
    SharedMutexMode["FREE"] = "FREE";
    // Indicates that a shared lock is currently held *AND* that no exclusive
    // locks are waiting. Meaning that the `SharedMutex` may mint additional
    // shared locks.
    SharedMutexMode["SHARED"] = "SHARED";
    // Indicates that either an exclusive lock is currently held *OR* an exclusive
    // lock is waiting. In either case, no other locks may be immediately
    // acquired. All current locks must be drained and additional contexts forced
    // to wait until the exclusive lock is released.
    SharedMutexMode["EXCLUSIVE"] = "EXCLUSIVE";
})(SharedMutexMode || (SharedMutexMode = {}));
