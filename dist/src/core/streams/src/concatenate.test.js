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
const status = __importStar(require("@core/status"));
const webStreams = __importStar(require("web-streams-polyfill"));
const streams = __importStar(require("./index"));
describe('concatenate', () => {
    it('returns empty array for no streams.', async () => {
        expect(status.throwIfError(await streams.toArray(streams.concatenate([])))).toStrictEqual([]);
    });
    it('returns empty array for an empty stream.', async () => {
        const stream = new webStreams.ReadableStream({
            start(controller) {
                controller.close();
            },
        });
        expect(status.throwIfError(await streams.toArray(streams.concatenate([stream])))).toStrictEqual([]);
    });
    it('collects all values from a non-error state stream.', async () => {
        const stream = webStreams.ReadableStream.from([100, 200, 300]);
        expect(status.throwIfError(await streams.toArray(streams.concatenate([stream])))).toStrictEqual([100, 200, 300]);
    });
    it('collects all values from two non-error state streams.', async () => {
        const firstStream = webStreams.ReadableStream.from([100, 200, 300]);
        const secondStream = webStreams.ReadableStream.from([400, 500, 600]);
        expect(status.throwIfError(await streams.toArray(streams.concatenate([firstStream, secondStream])))).toStrictEqual([100, 200, 300, 400, 500, 600]);
    });
    it('drains the streams in order.', async () => {
        let firstController;
        const firstStream = new webStreams.ReadableStream({
            start(controller) {
                firstController = controller;
            },
        });
        let secondController;
        const secondStream = new webStreams.ReadableStream({
            start(controller) {
                secondController = controller;
            },
        });
        secondController.enqueue(400);
        firstController.enqueue(100);
        secondController.enqueue(500);
        firstController.enqueue(200);
        secondController.enqueue(600);
        firstController.enqueue(300);
        secondController.close();
        firstController.close();
        expect(status.throwIfError(await streams.toArray(streams.concatenate([firstStream, secondStream])))).toStrictEqual([100, 200, 300, 400, 500, 600]);
    });
    it('returns an error when a stream errors.', async () => {
        const firstStream = webStreams.ReadableStream.from([100, 200]);
        const secondStream = new webStreams.ReadableStream({
            start(controller) {
                controller.enqueue(300);
                controller.error(status.fromError('Expected error.'));
            },
        });
        expect(await streams.toArray(streams.concatenate([firstStream, secondStream]))).toMatchObject({
            error: 'Expected error.',
        });
    });
    it('does not buffer data in the concat stream.', async () => {
        const pull = jest.fn();
        const upstream = new webStreams.ReadableStream({ pull }, new webStreams.CountQueuingStrategy({ highWaterMark: 0 }));
        const merged = streams.concatenate([upstream]);
        const mergedReader = merged.getReader();
        expect(pull).toHaveBeenCalledTimes(0);
        pull.mockImplementationOnce((controller) => {
            controller.enqueue(100);
        });
        await mergedReader.read();
        expect(pull).toHaveBeenCalledTimes(1);
        pull.mockImplementationOnce((controller) => {
            controller.close();
        });
        await mergedReader.read();
        expect(pull).toHaveBeenCalledTimes(2);
    });
});
