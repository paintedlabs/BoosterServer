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
const status = __importStar(require("@core/status"));
const webStreams = __importStar(require("web-streams-polyfill"));
const streams = __importStar(require("./index"));
describe('toArray', () => {
    it('returns empty array for an empty stream.', () => __awaiter(void 0, void 0, void 0, function* () {
        const stream = webStreams.ReadableStream.from([]);
        expect(status.throwIfError(yield streams.toArray(stream))).toStrictEqual([]);
    }));
    it('collects all values from a non-error state stream.', () => __awaiter(void 0, void 0, void 0, function* () {
        const stream = webStreams.ReadableStream.from([100, 200, 300]);
        expect(status.throwIfError(yield streams.toArray(stream))).toStrictEqual([
            100, 200, 300,
        ]);
    }));
    it('returns an error when the stream errors.', () => __awaiter(void 0, void 0, void 0, function* () {
        const stream = new webStreams.ReadableStream({
            start(controller) {
                controller.enqueue(100);
                controller.enqueue(200);
                controller.error(status.fromError('Expected error.'));
            },
        });
        expect(yield streams.toArray(stream)).toMatchObject({
            error: 'Expected error.',
        });
    }));
});
