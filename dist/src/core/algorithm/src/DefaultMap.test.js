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
describe('DefaultMap', () => {
    it('returns default value for unset keys', () => {
        const map = algorithm.createDefaultMap(() => 100);
        expect(map.has('missing')).toBe(false);
        expect(map.get('missing')).toBe(100);
        expect(map.has('missing')).toBe(true);
    });
    it('returns existing values without invoking factory', () => {
        const factory = jest.fn(() => 'default');
        const map = algorithm.createDefaultMap(factory, [['exists', 'value']]);
        expect(map.get('exists')).toBe('value');
        expect(factory).not.toHaveBeenCalled();
    });
    it('passes correct key to factory', () => {
        const factory = jest.fn((key) => key * 2);
        const map = algorithm.createDefaultMap(factory);
        expect(map.get(5)).toBe(10);
        expect(factory).toHaveBeenCalledWith(5);
    });
    it('maintains correct size', () => {
        const map = algorithm.createDefaultMap(() => null, [
            ['a', 1],
            ['b', 2],
        ]);
        expect(map.size).toBe(2);
        map.get('c');
        expect(map.size).toBe(3);
        map.delete('a');
        expect(map.size).toBe(2);
    });
    it('supports standard Map methods', () => {
        const map = algorithm.createDefaultMap(() => 'default');
        expect(map.has('key')).toBe(false);
        map.get('key');
        expect(map.has('key')).toBe(true);
        map.set('key', 'custom');
        expect(map.get('key')).toBe('custom');
        map.delete('key');
        expect(map.has('key')).toBe(false);
        expect(map.get('key')).toBe('default');
        expect(Array.from(map.entries())).toStrictEqual([['key', 'default']]);
        expect(Array.from(map.keys())).toStrictEqual(['key']);
        expect(Array.from(map.values())).toStrictEqual(['default']);
    });
    it('saves the default value to the map so that identity is preserved.', () => {
        const map = algorithm.createDefaultMap(() => []);
        const firstLookup = map.get('foo');
        const secondLookup = map.get('foo');
        expect(firstLookup).toBe(secondLookup);
    });
    it('does not treat falsey values as unset keys.', () => {
        const map = algorithm.createDefaultMap(() => 'default', [
            ['foo', null],
            ['bar', undefined],
            ['baz', false],
            ['qux', ''],
        ]);
        expect(map.get('foo')).toBe(null);
        expect(map.get('bar')).toBe(undefined);
        expect(map.get('baz')).toBe(false);
        expect(map.get('qux')).toBe('');
    });
    it('is instance of Map', () => {
        const map = algorithm.createDefaultMap(() => 0);
        expect(map instanceof Map).toBe(true);
    });
});
