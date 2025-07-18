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
exports.fromNativeError = exports.toNativeError = exports.throwIfError = exports.tryCatchAsync = exports.tryCatch = void 0;
const statusOr = __importStar(require("./StatusOr"));
/**
 * Wraps the provided lambda in a try-catch, and returns a failed StatusOr if
 * exceptions are thrown. This allows us to use 3rd party packages which throw
 * errors in our codebase which expects no errors to be thrown.
 *
 * Example Usage:
 *
 * ```ts
 * const maybeFoo = statusOr.tryCatch(
 *   () => thirdPartyCode.getFoo(),
 *   (error) =>
 *     statusOr.fromError(`Failed to get foo with error ${error.message}.`)
 * );
 * ```
 *
 * @param wrapped The lambda to call. Returns a value which will be wrapped with
 *   StatusOr if the lambda succeeds without errors.
 * @param errorMessageFactory A lambda which converts a thrown error into an
 *   error message and status type. Used to customize the errors returned by
 *   failed lambdas.
 *
 * @returns StatusOr<T> the return type of the lambda wrapped as a StatusOr.
 */
const tryCatch = (wrapped, errorMessageFactory) => {
    try {
        return statusOr.fromValue(wrapped());
    }
    catch (errorObject) {
        return errorMessageFactory(errorObject);
    }
};
exports.tryCatch = tryCatch;
/**
 * Async counterpart to `tryCatch`. See `tryCatch` documentation for details.
 *
 * @param wrapped The lambda to call. Returns a value which will be wrapped with
 *   StatusOr if the lambda succeeds without errors.
 * @param errorMessageFactory A lambda which converts a thrown error into an
 *   error message and status type. Used to customize the errors returned by
 *   failed lambdas.
 *
 * @returns The return type of the lambda wrapped as a StatusOr.
 */
const tryCatchAsync = async (wrapped, errorMessageFactory) => {
    try {
        return statusOr.fromValue(await wrapped());
    }
    catch (errorObject) {
        return errorMessageFactory(errorObject);
    }
};
exports.tryCatchAsync = tryCatchAsync;
/**
 * Unwraps a StatusOr for an environment where StatusOr is not supported.
 * If the StatusOr is an error, throws an error - otherwise returns the
 * StatusOr's value.
 *
 * @param maybeValue The StatusOr.
 * @param createMessage This callback will be called if status is an error
 *   StatusOr and allows the caller to customize the message of the constructed
 *   error.
 *
 * @throws If the status is not OK.
 *
 * @returns The value of statusOr.
 */
const throwIfError = (maybeValue, createMessage) => {
    if (!statusOr.isOk(maybeValue)) {
        throw (0, exports.toNativeError)(maybeValue, createMessage, exports.throwIfError);
    }
    return maybeValue.value;
};
exports.throwIfError = throwIfError;
/**
 * Converts a `ErrorStatusOr` to Javascript's native `Error`.
 *
 * @param errorStatusOr - The StatusOr error to convert.
 * @param formatMessage - Native errors use error strings, by default we
 *   stringify the StatusOr error, but an alternative formatter can be provided
 *   here.
 * @param constructor - Javascript errors have an unexpected behavior: they
 *   preserve information about where the error was originally created so that
 *   if the stack is modified, they can log both where the error originated, and
 *   the modified stacktrace. This means errors from this method will contain
 *   two pieces of information: first, the location where `toNativeError` was
 *   called, and second the stacktrace from the `ErrorStatusOr`. This parameter
 *   can be used to further manipulate the former. If given, all frames above
 *   and including the specified function will be omitted from the originating
 *   stacktrace. It is useful for hiding implementation details of error
 *   generation from the user. See `Error.captureStackTrace` for more details.
 *
 * @returns A native error representing the provided StatusOr error.
 */
const toNativeError = (errorStatusOr, formatMessage, 
// Typically we don't permit raw `Function` types, but in this case it's
// desired to match the call signature of `Error.captureStackTrace`.
//
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
constructor) => {
    const nativeError = new Error(formatMessage
        ? formatMessage(errorStatusOr.error)
        : JSON.stringify(errorStatusOr.error));
    /// When node or the browser displays an uncaught error, it first prints where
    /// the error was created, and then prints the error including its stacktrace
    /// which may be modified. Surprisingly, if we set the `stack` with
    /// `Error.captureStackTrace` we're able to influence the first few lines
    /// which indicate where an error was created. We can then modify `stack`
    /// again *without* using `Error.captureStackTrace` to influence the error's
    /// displayed stack.
    ///
    /// Using both together allows us to print errors in the following format:
    ///
    /// ```
    /// <stack where the native Error was created>
    //
    /// <stack where the ErrorStatusOr was created>
    /// ```
    ///
    /// Such as
    ///
    /// ```
    /// packages/booster-tutor/cli/src/commands/tcgCsv.ts:55
    ///     status.throwIfError(
    ///            ^
    ///
    /// Error: {"type":"UNEXPECTED_STATUS","expected":200,"observed":403}
    ///     at genericFetchBody (packages/core/net/src/fetchBody.ts:71:19)
    ///     at async fetchGroups (packages/booster-tutor/backend/shared/tcg-csv/src/fetchGroups.ts:37:1)
    ///     at async Command.getGroups (packages/booster-tutor/cli/src/commands/tcgCsv.ts:56:7) {
    /// ```
    // 1. Influence the first few lines of the error reporting to correctly show
    //    where the error was created by eliding status internal methods.
    if (Error.captureStackTrace != null) {
        Error.captureStackTrace(nativeError, constructor ?? exports.toNativeError);
    }
    // 2. Influence the remainder of error reporting to show the ErrorStatusOr's
    //    stacktrace.
    //
    // Note that `ErrorStatusOr.traceback` is lazily evaluated for performance, so
    // it's critical that we maintain lazy evaluation when copying the traceback
    // onto the native error.
    Object.defineProperty(nativeError, 'stack', {
        get() {
            // Error logging in node specifically is slightly strange. While the
            // browser will source the error message from `Error.message`, node
            // sources that information from the stacktrace. Unfortunately, our
            // stacktraces are created without a message context as the message may be
            // rewritten. Therefore to accomodate node, we inject our message content
            // into the stacktrace dynamically.
            return errorStatusOr.traceback?.replace(/^Error\n/, `Error: ${nativeError.message}\n`);
        },
        configurable: true,
        enumerable: true,
    });
    // When errors are thrown, most runtimes will additionally log any enumerable
    // fields as debugging context. For this reason we attach a number of useful
    // `StatusOr` details.
    Object.assign(nativeError, {
        retriable: errorStatusOr.retriable,
        error: errorStatusOr.error,
        changelog: errorStatusOr.changelog,
    });
    // Attached for use with `fromNativeError`.
    //
    // Note that this property is *not* enumerable so that the entire
    // `errorStatusOr` field is not logged when errors are thrown.
    Object.defineProperty(nativeError, 'errorStatusOr', {
        value: errorStatusOr,
        configurable: true,
        enumerable: false,
        writable: false,
    });
    return nativeError;
};
exports.toNativeError = toNativeError;
/**
 * Forms an `ErrorStatusOr` from Javascript's native `Error`.
 *
 * @param error - The native `Error`.
 *
 * @returns A `ErrorStatusOr`.
 */
const fromNativeError = (error) => {
    // Errors formed by `toNativeError` may contain the field `errorStatusOr`. To
    // access that field we need to coerce the type here.
    //
    // Note that we do this here rather than in the parameters to avoid polluting
    // the method signature with implementation details that should remain opaque.
    const maybeContainsErrorStatusOr = error;
    if (maybeContainsErrorStatusOr.errorStatusOr != null &&
        statusOr.isStatusOr(maybeContainsErrorStatusOr.errorStatusOr) &&
        !statusOr.isOk(maybeContainsErrorStatusOr.errorStatusOr)) {
        return maybeContainsErrorStatusOr.errorStatusOr;
    }
    return statusOr.fromError(error.message);
};
exports.fromNativeError = fromNativeError;
