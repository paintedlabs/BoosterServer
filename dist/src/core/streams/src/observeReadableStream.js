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
exports.observeReadableStream = void 0;
const webStreams = __importStar(require("web-streams-polyfill"));
/**
 * Wraps a ReadableStream to observe lifecycle events.
 *
 * This function creates a transparent wrapper around an existing
 * ReadableStream, allowing observation of key stream events without modifying
 * the original stream's behavior.
 *
 * Note that the provided `stream` will be locked and become unreadable. Clients
 * must use the returned `ReadableStream` to access data.
 *
 * @param stream - The source ReadableStream to observe.
 * @param triggers - Lifecycle event callbacks.
 *
 * @return A new ReadableStream that mirrors the source stream with the
 *   additional lifecycle callbacks.
 */
const observeReadableStream = (stream, triggers) => {
    const reader = stream.getReader();
    return new webStreams.ReadableStream({
        pull(controller) {
            return __awaiter(this, void 0, void 0, function* () {
                if (triggers.onPull != null) {
                    triggers.onPull();
                }
                try {
                    const { done, value } = yield reader.read();
                    if (done) {
                        controller.close();
                        reader.releaseLock();
                        if (triggers.onClose != null) {
                            triggers.onClose();
                        }
                        return;
                    }
                    controller.enqueue(value);
                }
                catch (error) {
                    controller.error(error);
                    reader.releaseLock();
                    if (triggers.onError != null) {
                        triggers.onError(error);
                    }
                }
            });
        },
        cancel(reason) {
            return __awaiter(this, void 0, void 0, function* () {
                yield reader.cancel(reason);
                reader.releaseLock();
                if (triggers.onCancel != null) {
                    triggers.onCancel();
                }
            });
        },
    }, 
    // It's important when wrapping the original stream that we don't
    // inadvertently buffer its contents into the intermediate ReadableStream.
    // We want the intermediate ReadableStream to act transparently.
    new webStreams.CountQueuingStrategy({ highWaterMark: 0 }));
};
exports.observeReadableStream = observeReadableStream;
