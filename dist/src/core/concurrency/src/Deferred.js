"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeferred = void 0;
/**
 * Creates a new "Deferred" promise.
 *
 * @returns `Deferred<T>`.
 */
const createDeferred = () => {
    let deferredResolve;
    let deferredReject;
    const promise = new Promise((resolve, reject) => {
        deferredResolve = resolve;
        deferredReject = reject;
    });
    return {
        promise,
        resolve: deferredResolve,
        reject: deferredReject,
    };
};
exports.createDeferred = createDeferred;
