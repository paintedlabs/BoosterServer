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
exports.toArray = void 0;
const status = __importStar(require("@core/status"));
const webStreams = __importStar(require("web-streams-polyfill"));
/**
 * Converts a given readable stream into an array.
 *
 * __IMPORTANT NOTE:__ Streams are designed to manage backpressure, which means
 * they control the flow of data so that the data source does not overwhelm the
 * consumer. This helps in efficiently using compute resources. By converting
 * the stream into an array, we lose the ability to manage backpressure because
 * we gather data as fast as it is buffered, not as fast as it is processed.
 * Generally, it's better to use `WritableStream` or `TransformStream` to handle
 * `ReadableStream` data. This function is mostly useful for testing purposes
 * rather than in production.
 *
 * @param stream - The stream to drain into an array.
 *
 * @returns An array containing the streamed data.
 */
const toArray = (stream) => __awaiter(void 0, void 0, void 0, function* () {
    const buffer = [];
    const sink = new webStreams.WritableStream({
        write(chunk) {
            buffer.push(chunk);
        },
    });
    try {
        yield stream.pipeTo(sink);
        return status.fromValue(buffer);
    }
    catch (error) {
        if (status.isStatusOr(error) && !status.isOk(error)) {
            return error;
        }
        else if (error instanceof Error) {
            return status.fromNativeError(error);
        }
        else {
            return status.fromError(error);
        }
    }
});
exports.toArray = toArray;
