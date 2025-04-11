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
const streams = __importStar(require("./index"));
describe('observeReadableStream', () => {
    it('correctly calls triggers when stream is naturally drained.', () => __awaiter(void 0, void 0, void 0, function* () {
        const sourceStream = streams.ReadableStream.from([100, 200, 300]);
        const onCancel = jest.fn();
        const onClose = jest.fn();
        const onPull = jest.fn();
        const onError = jest.fn();
        const observedStream = streams.observeReadableStream(sourceStream, {
            onCancel,
            onClose,
            onPull,
            onError,
        });
        expect(onCancel).toHaveBeenCalledTimes(0);
        expect(onClose).toHaveBeenCalledTimes(0);
        expect(onPull).toHaveBeenCalledTimes(0);
        expect(onError).toHaveBeenCalledTimes(0);
        const reader = observedStream.getReader();
        expect(yield reader.read()).toStrictEqual({ done: false, value: 100 });
        expect(onCancel).toHaveBeenCalledTimes(0);
        expect(onClose).toHaveBeenCalledTimes(0);
        expect(onPull).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledTimes(0);
        expect(yield reader.read()).toStrictEqual({ done: false, value: 200 });
        expect(onCancel).toHaveBeenCalledTimes(0);
        expect(onClose).toHaveBeenCalledTimes(0);
        expect(onPull).toHaveBeenCalledTimes(2);
        expect(onError).toHaveBeenCalledTimes(0);
        expect(yield reader.read()).toStrictEqual({ done: false, value: 300 });
        expect(onCancel).toHaveBeenCalledTimes(0);
        expect(onClose).toHaveBeenCalledTimes(0);
        expect(onPull).toHaveBeenCalledTimes(3);
        expect(onError).toHaveBeenCalledTimes(0);
        expect(yield reader.read()).toStrictEqual({
            done: true,
            value: undefined,
        });
        expect(onCancel).toHaveBeenCalledTimes(0);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onPull).toHaveBeenCalledTimes(4);
        expect(onError).toHaveBeenCalledTimes(0);
        // Ensure that the upstream's reader is released.
        yield expect(sourceStream.getReader().closed).resolves.toBeUndefined();
    }));
    it('correctly calls triggers when stream is cancelled.', () => __awaiter(void 0, void 0, void 0, function* () {
        const sourceStream = streams.ReadableStream.from([100, 200, 300]);
        const onCancel = jest.fn();
        const onClose = jest.fn();
        const onPull = jest.fn();
        const onError = jest.fn();
        const observedStream = streams.observeReadableStream(sourceStream, {
            onCancel,
            onClose,
            onPull,
            onError,
        });
        expect(onCancel).toHaveBeenCalledTimes(0);
        expect(onClose).toHaveBeenCalledTimes(0);
        expect(onPull).toHaveBeenCalledTimes(0);
        expect(onError).toHaveBeenCalledTimes(0);
        const reader = observedStream.getReader();
        expect(yield reader.read()).toStrictEqual({ done: false, value: 100 });
        expect(onCancel).toHaveBeenCalledTimes(0);
        expect(onClose).toHaveBeenCalledTimes(0);
        expect(onPull).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledTimes(0);
        yield reader.cancel();
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(0);
        expect(onPull).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledTimes(0);
        // Ensure that when cancelled, the upstream is closed.
        yield expect(sourceStream.getReader().closed).resolves.toBeUndefined();
    }));
    it('correctly calls triggers when stream errors.', () => __awaiter(void 0, void 0, void 0, function* () {
        const sourceStream = new streams.ReadableStream({
            pull: (controller) => {
                controller.error('Expected error.');
            },
        });
        const onCancel = jest.fn();
        const onClose = jest.fn();
        const onPull = jest.fn();
        const onError = jest.fn();
        const observedStream = streams.observeReadableStream(sourceStream, {
            onCancel,
            onClose,
            onPull,
            onError,
        });
        expect(onCancel).toHaveBeenCalledTimes(0);
        expect(onClose).toHaveBeenCalledTimes(0);
        expect(onPull).toHaveBeenCalledTimes(0);
        expect(onError).toHaveBeenCalledTimes(0);
        const reader = observedStream.getReader();
        yield expect(reader.read()).rejects.toBe('Expected error.');
        expect(onCancel).toHaveBeenCalledTimes(0);
        expect(onClose).toHaveBeenCalledTimes(0);
        expect(onPull).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith('Expected error.');
        // Ensure that the upstream's reader is released.
        yield expect(sourceStream.getReader().closed).rejects.toBe('Expected error.');
    }));
});
