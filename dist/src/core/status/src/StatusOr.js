"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromError = exports.fromValue = exports.isOk = exports.isStatusOr = exports.ChangeEventType = void 0;
var ChangeEventType;
(function (ChangeEventType) {
    ChangeEventType["REWRITE"] = "REWRITE";
})(ChangeEventType || (exports.ChangeEventType = ChangeEventType = {}));
const isStatusOr = (thing) => typeof thing === 'object' &&
    thing != null &&
    '__typename' in thing &&
    thing.__typename === STATUS_OR_IDENTIFIER;
exports.isStatusOr = isStatusOr;
const isOk = (statusOr) => 'value' in statusOr;
exports.isOk = isOk;
const fromValue = (value) => ({
    __typename: STATUS_OR_IDENTIFIER,
    value,
});
exports.fromValue = fromValue;
const fromError = (error, options) => {
    const optionsWithDefaults = Object.assign({ retriable: false }, (options !== null && options !== void 0 ? options : {}));
    const tracebackGetter = createLazyTracebackGetter(exports.fromError);
    return {
        __typename: STATUS_OR_IDENTIFIER,
        error,
        retriable: optionsWithDefaults.retriable,
        changelog: [],
        get traceback() {
            return tracebackGetter();
        },
    };
};
exports.fromError = fromError;
/**
 * This function returns a getter which will provide a traceback from the time
 * the getter was created.
 *
 * Many JS runtimes optimize errors by deferring expensive traceback operations
 * until a traceback is actually accessed. Therefore it's critical for
 * performance in `ErrorStatusOr` that we do not access a traceback until it's
 * required.
 *
 * @param before - The acquired traceback will only contain stack frames from
 *   before the provided method was called. This is useful to ensure that traces
 *   do not contain internal error creation helpers such as `fromError`.
 *
 * @returns A lazy getter for the traceback.
 *
 * @see https://developer.chrome.com/blog/faster-stack-traces/
 */
const createLazyTracebackGetter = (
// Typically we don't permit raw `Function` types, but in this case it's
// desired to match the call signature of `Error.captureStackTrace`.
//
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
before) => {
    if (Error.captureStackTrace == null) {
        const error = new Error();
        return () => error.stack;
    }
    const reader = {};
    Error.captureStackTrace(reader, before !== null && before !== void 0 ? before : createLazyTracebackGetter);
    return () => reader.stack;
};
// For most typeguards we'd just check if the unknown type has the same shape as
// our target type. However, `StatusOr` has very common structure (literally
// just the field `value`). To more clearly distinguish it from other unknown
// types we add this identifier to all StatusOr instances.
const STATUS_OR_IDENTIFIER = '@core/status#StatusOr';
