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
const algorithm = __importStar(require("./index"));
let randomSpy;
beforeEach(() => {
    randomSpy = jest.spyOn(global.Math, 'random');
});
afterEach(() => {
    randomSpy.mockRestore();
});
describe('StochasticSampler', () => {
    it('Returns an error when there is no data to sample.', () => {
        const sampler = algorithm.createStochasticSampler({ weights: new Map() });
        expect(sampler).toMatchObject({
            error: expect.any(String),
        });
    });
    it('Returns an error when all weights are less than or equal to zero.', () => {
        const sampler = algorithm.createStochasticSampler({
            weights: new Map([
                ['foo', 0],
                ['bar', -1],
                ['baz', 0],
            ]),
        });
        expect(sampler).toMatchObject({
            error: expect.any(String),
        });
    });
    it('Discards negative weights by default.', () => {
        const sampler = status.throwIfError(algorithm.createStochasticSampler({
            weights: new Map([
                ['foo', -1],
                ['bar', -1],
                ['baz', 1],
            ]),
        }));
        expect(sampler.sample()).toBe('baz');
    });
    it('Returns an error on negative weights when strictWeights is enabled.', () => {
        const sampler = algorithm.createStochasticSampler({
            weights: new Map([
                ['foo', -1],
                ['bar', -1],
                ['baz', 1],
            ]),
            strictWeights: true,
        });
        expect(sampler).toMatchObject({
            error: expect.any(String),
        });
    });
    it('Can sample a uniform distribution', () => {
        const sampler = status.throwIfError(algorithm.createStochasticSampler({
            weights: new Map([
                ['foo', 1],
                ['bar', 1],
                ['baz', 1],
                ['qux', 1],
            ]),
        }));
        randomSpy.mockReturnValue(0.2);
        expect(sampler.sample()).toBe('foo');
        randomSpy.mockReturnValue(0.4);
        expect(sampler.sample()).toBe('bar');
        randomSpy.mockReturnValue(0.6);
        expect(sampler.sample()).toBe('baz');
        randomSpy.mockReturnValue(0.8);
        expect(sampler.sample()).toBe('qux');
    });
    it('Can sample a non-uniform distribution.', () => {
        const sampler = status.throwIfError(algorithm.createStochasticSampler({
            weights: new Map([
                ['foo', 1],
                ['bar', 8],
                ['baz', 1],
            ]),
        }));
        randomSpy.mockReturnValue(0);
        expect(sampler.sample()).toBe('foo');
        randomSpy.mockReturnValue(0.099);
        expect(sampler.sample()).toBe('foo');
        randomSpy.mockReturnValue(0.1);
        expect(sampler.sample()).toBe('bar');
        randomSpy.mockReturnValue(0.899);
        expect(sampler.sample()).toBe('bar');
        randomSpy.mockReturnValue(0.9);
        expect(sampler.sample()).toBe('baz');
        randomSpy.mockReturnValue(0.999);
        expect(sampler.sample()).toBe('baz');
    });
    it('Modifying the weights after creation has no impact.', () => {
        const weights = new Map([['foo', 1]]);
        const sampler = status.throwIfError(algorithm.createStochasticSampler({ weights }));
        weights.clear();
        expect(sampler.sample()).toBe('foo');
    });
});
