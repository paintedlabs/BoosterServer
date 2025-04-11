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
const status = __importStar(require("./index"));
describe('toNativeError', () => {
    it('By default JSON serializes the ErrorStatusOr', () => {
        const error = status.toNativeError(status.fromError('foobar'));
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toStrictEqual('"foobar"');
    });
    it('Accepts a custom formatter', () => {
        const error = status.toNativeError(status.fromError('foobar'), (error) => `Custom formatted ${error}`);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toStrictEqual('Custom formatted foobar');
    });
});
describe('fromNativeError', () => {
    it('Uses the error message.', () => {
        const error = status.fromNativeError(new Error('foobar'));
        expect(status.isStatusOr(error)).toBe(true);
        expect(error.error).toStrictEqual('foobar');
    });
    it('Is symmetrical with toNativeError', () => {
        const error = status.fromNativeError(status.toNativeError(status.fromError('foobar'), (error) => `Custom formatted ${error}`));
        expect(status.isStatusOr(error)).toBe(true);
        expect(error.error).toStrictEqual('foobar');
    });
});
describe('throwIfError', () => {
    it('throws if a statusOr is an error', () => {
        expect(() => status.throwIfError(status.fromError('error'))).toThrow();
    });
    it('returns the value if a statusOr is ok', () => {
        expect(status.throwIfError(status.fromValue(10))).toEqual(10);
    });
});
