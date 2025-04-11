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
exports.createStochasticSampler = void 0;
const status = __importStar(require("@core/status"));
const binarySearch = __importStar(require("./binarySearch"));
/**
 * Creates a new StochasticSampler.
 *
 * Note that the StochasticSampler will not update its weights once it's
 * created. The provided options are copied. To modify the sampling, a new
 * sampler must be created.
 *
 * @param options - Creation options.
 *
 * @return StochasticSampler.
 */
const createStochasticSampler = (options) => {
    const optionsWithDefaults = Object.assign({ strictWeights: false }, options);
    const { weights, strictWeights } = optionsWithDefaults;
    // It's important that we store the values associated with each prefix sum
    // rather than relying on `weights` so that we safeguard this implementation
    // against `weights` modifying after we've created the sampler.
    let totalWeight = 0;
    const prefixSum = [];
    for (const [value, weight] of weights.entries()) {
        if (strictWeights && weight < 0) {
            return status.fromError('Negative weights are disallowed when strictWeights is enabled.');
        }
        // We can discard weights which cannot be sampled.
        if (weight <= 0) {
            continue;
        }
        totalWeight += weight;
        prefixSum.push([value, totalWeight]);
    }
    // We cannot sample data when none is present.
    if (totalWeight === 0) {
        return status.fromError('There are no items to sample.');
    }
    const sample = () => {
        const target = Math.random() * totalWeight;
        const result = binarySearch.binarySearch({
            start: 0,
            end: prefixSum.length - 1,
            visit: (index) => {
                const current = prefixSum[index][1];
                const previous = index === 0 ? 0 : prefixSum[index - 1][1];
                if (target >= previous && target < current) {
                    return 0;
                }
                return target < current ? -1 : 1;
            },
        });
        if (result == null) {
            // This should never occur, the above binary search should be formulated
            // so that the target is always within the search domain.
            throw new Error('Unexpected error: StochasticSampler failed to sample.');
        }
        return prefixSum[result][0];
    };
    return status.fromValue({ sample });
};
exports.createStochasticSampler = createStochasticSampler;
