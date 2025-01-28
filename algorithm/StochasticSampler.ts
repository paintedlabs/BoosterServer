import * as binarySearch from './binarySearch';

/**
 * Supports weighted sampling.
 */
export type StochasticSampler<T> = {
  sample: () => T;
};

export type CreateStochasticSamplerOptions<T> = {
  weights: Map<T, number>;
};

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
export const createStochasticSampler = <T>(
  options: CreateStochasticSamplerOptions<T>,
): StochasticSampler<T> | null => {
  const { weights } = options;

  if (weights.size === 0) {
    return null;
  }

  // It's important that we store the values associated with each prefix sum
  // rather than relying on `weights` so that we safeguard this implementation
  // against `weights` modifying after we've created the sampler.
  let totalWeight = 0;
  const prefixSum: Array<[T, number]> = [];
  for (const [value, weight] of weights.entries()) {
    totalWeight += weight;
    prefixSum.push([value, totalWeight]);
  }

  const sample: StochasticSampler<T>['sample'] = () => {
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

  return { sample };
};
