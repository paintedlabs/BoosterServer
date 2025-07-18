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
exports.concatenate = void 0;
const webStreams = __importStar(require("web-streams-polyfill"));
/**
 * Merges an array of readable streams into a single readable stream by reading
 * them in series.
 *
 * @param streams - An array of readable streams.
 *
 * @returns A single stream from all the inputted streams.
 */
const concatenate = (streams) => {
    const streamsIterator = streams[Symbol.iterator]();
    let currentReader = null;
    return new webStreams.ReadableStream({
        async pull(controller) {
            while (true) {
                // If there's no current reader, try to get the next stream.
                if (currentReader == null) {
                    const { value: nextStream, done } = streamsIterator.next();
                    if (done) {
                        controller.close();
                        return;
                    }
                    currentReader = nextStream.getReader();
                }
                // Read from the current stream.
                const result = await currentReader.read();
                if (!result.done) {
                    controller.enqueue(result.value);
                    return;
                }
                // When the current stream is exhausted, release its lock.
                currentReader.releaseLock();
                currentReader = null;
            }
        },
    }, new webStreams.CountQueuingStrategy({ highWaterMark: 0 }));
};
exports.concatenate = concatenate;
