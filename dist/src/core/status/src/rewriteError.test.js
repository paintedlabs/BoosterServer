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
describe('rewriteError', () => {
    it('Preserves the traceback.', () => {
        const originalError = status.fromError('foo');
        const rewrittenError = status.rewriteError(originalError, () => 'bar');
        expect(originalError.error).toEqual('foo');
        expect(rewrittenError.error).toEqual('bar');
        expect(originalError.traceback).toBe(rewrittenError.traceback);
    });
    it('Preserves retriable.', () => {
        const originalError = status.fromError('foo', { retriable: true });
        const rewrittenError = status.rewriteError(originalError, () => 'bar');
        expect(originalError.error).toEqual('foo');
        expect(originalError.retriable).toBe(true);
        expect(rewrittenError.error).toEqual('bar');
        expect(rewrittenError.retriable).toBe(true);
    });
    it('Records rewrites in the changelog.', () => {
        const originalError = status.fromError('foo');
        const rewrittenError = status.rewriteError(originalError, () => 'bar');
        expect(originalError.changelog).toStrictEqual([]);
        expect(rewrittenError.changelog).toStrictEqual([
            {
                type: status.ChangeEventType.REWRITE,
                rewrittenError: 'foo',
            },
        ]);
    });
    it('Multiple rewrites are correctly ordered in the changelog.', () => {
        let error = status.fromError('foo');
        error = status.rewriteError(error, () => 'bar');
        error = status.rewriteError(error, () => 'baz');
        error = status.rewriteError(error, () => 'qux');
        expect(error.error).toBe('qux');
        expect(error.changelog).toStrictEqual([
            {
                type: status.ChangeEventType.REWRITE,
                rewrittenError: 'foo',
            },
            {
                type: status.ChangeEventType.REWRITE,
                rewrittenError: 'bar',
            },
            {
                type: status.ChangeEventType.REWRITE,
                rewrittenError: 'baz',
            },
        ]);
    });
});
describe('rewriteIfError', () => {
    it('Passes through non-error statuses.', () => {
        const okStatus = status.fromValue('foo');
        expect(status.rewriteIfError(okStatus, () => 'bar')).toBe(okStatus);
    });
    it('Rewrites error statuses.', () => {
        const originalError = status.fromError('foo');
        const rewrittenError = status.rewriteIfError(originalError, () => 'bar');
        expect(originalError).toMatchObject({ error: 'foo' });
        expect(rewrittenError).toMatchObject({ error: 'bar' });
    });
});
