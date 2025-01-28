import * as status from '@tsnode-template/status';

import * as binarySearch from './binarySearch';

/**
 * Supports weighted sampling.
 */
export type StochasticSampler<T> = {
  sample: () => T;
};

export type CreateStochasticSamplerOptions<T> = {
  weights: Map<T, number>;

  // By default, negative weights are discarded. However, when strict weights is
  // enabled negative weights will cause sampler creation to fail.
  strictWeights?: boolean;
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
): status.StatusOr<StochasticSampler<T>> => {
  const optionsWithDefaults: Required<CreateStochasticSamplerOptions<T>> = {
    strictWeights: false,
    ...options,
  };

  const { weights, strictWeights } = optionsWithDefaults;

  // It's important that we store the values associated with each prefix sum
  // rather than relying on `weights` so that we safeguard this implementation
  // against `weights` modifying after we've created the sampler.
  let totalWeight = 0;
  const prefixSum: Array<[T, number]> = [];
  for (const [value, weight] of weights.entries()) {
    if (strictWeights && weight < 0) {
      return status.fromError(
        'Negative weights are disallowed when strictWeights is enabled.',
      );
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

  return status.fromValue({ sample });
};
