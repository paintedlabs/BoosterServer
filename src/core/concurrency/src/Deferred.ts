/**
 * Promises accept a callback which can resolve/reject. However, it's
 * occasionally useful to have more control over the timing and conditions of
 * the resolution or rejection of a Promise. In particular in scenarios where
 * we need to decouple promise creation and resolution. This type, `Deferred`,
 * supports these flows by exposing the otherwise internal resolve and reject
 * methods of a Promise.
 */
export type Deferred<T> = {
  promise: Promise<T>;
  resolve: DeferredResolve<T>;
  reject: DeferredReject;
};

export type DeferredResolve<T> = (value: T | PromiseLike<T>) => void;

export type DeferredReject = (reason?: unknown) => void;

/**
 * Creates a new "Deferred" promise.
 *
 * @returns `Deferred<T>`.
 */
export const createDeferred = <T>(): Deferred<T> => {
  let deferredResolve!: DeferredResolve<T>;
  let deferredReject!: DeferredReject;

  const promise = new Promise<T>((resolve, reject) => {
    deferredResolve = resolve;
    deferredReject = reject;
  });

  return {
    promise,
    resolve: deferredResolve,
    reject: deferredReject,
  };
};
