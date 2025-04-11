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
const algorithm = __importStar(require("./index"));
describe('DefaultRecord', () => {
    it('An unknown key to be the default value.', () => {
        const record = algorithm.createDefaultRecord({}, () => 100);
        expect(record['foo']).toStrictEqual(100);
    });
    it('Returns an existing value.', () => {
        const record = algorithm.createDefaultRecord({ foo: 200 }, () => 100);
        expect(record['foo']).toStrictEqual(200);
    });
    it('An undefined value to remain undefined.', () => {
        const record = algorithm.createDefaultRecord({ foo: undefined }, () => 100);
        expect(record['foo']).toStrictEqual(undefined);
    });
    it('A null value to remain null.', () => {
        const record = algorithm.createDefaultRecord({ foo: null }, () => 100);
        expect(record['foo']).toStrictEqual(null);
    });
    it('Increment and decrement operators work.', () => {
        const record = algorithm.createDefaultRecord({}, () => 0);
        expect(++record['foo']).toStrictEqual(1);
        expect(record['foo']).toStrictEqual(1);
        expect(--record['foo']).toStrictEqual(0);
        expect(record['foo']).toStrictEqual(0);
    });
    it('Saves the default value to the record so that identity is preserved.', () => {
        const record = algorithm.createDefaultRecord({}, () => []);
        const firstLookup = record['foo'];
        const secondLookup = record['foo'];
        expect(firstLookup).toBe(secondLookup);
    });
    it('Object.keys lists known keys.', () => {
        const record = algorithm.createDefaultRecord({ foo: 200 }, () => 100);
        expect(Object.keys(record)).toStrictEqual(['foo']);
        expect(record['bar']).toBe(100);
        expect(Object.keys(record)).toStrictEqual(['foo', 'bar']);
        record['baz'] = 300;
        expect(Object.keys(record)).toStrictEqual(['foo', 'bar', 'baz']);
    });
});
