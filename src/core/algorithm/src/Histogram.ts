/**
 * A histogram is a data structure which stores the frequency or count of
 * various elements (values) in a set, enabling efficient tracking and
 * manipulation of the occurrences of these elements.
 *
 * Note that counts cannot be negative and any values which have a count of zero
 * are removed from the Histogram to save space.
 */
export type Histogram<V> = {
  /**
   * Returns the count of a particular value in the histogram.
   *
   * @param value - The value to count.
   *
   * @returns The count.
   */
  getCount: (value: V) => number;

  /**
   * Enumerates through all values in the histogram and their counts.
   *
   * @returns An iterable with the same signature as `Object.entries`.
   */
  entries: () => Iterable<[V, number]>;

  /**
   * Increments the count of a specific value in the histogram.
   *
   * @param value - The value whose count to increment.
   * @param amount - If unspecified, the value's count will be incremented by 1.
   *   Otherwise, this parameter can be used to change how much to increment the
   *   count by.
   *
   * @returns The count of the value *after* it has been incremented.
   */
  increment: (value: V, amount?: number) => number;

  /**
   * Increments the count of several values in the histogram.
   *
   * @param values - The values whose count to increment.
   * @param amount - If unspecified, the values' count will be incremented by 1.
   *   Otherwise, this parameter can be used to change how much to increment the
   *   counts by.
   */
  incrementMany: (values: Iterable<V>, amount?: number) => void;

  /**
   * Decrements the count of a specific value in the histogram.
   *
   * @param value - The value whose count to decrement.
   * @param amount - If unspecified, the value's count will be decremented by 1.
   *   Otherwise, this parameter can be used to change how much to decrement the
   *   count by.
   *
   * @returns The count of the value *after* it has been decremented.
   */
  decrement: (value: V, amount?: number) => number;

  /**
   * Decrements the count of several values in the histogram.
   *
   * @param value - The values whose count to decrement.
   * @param amount - If unspecified, the values' count will be decremented by 1.
   *   Otherwise, this parameter can be used to change how much to decrement the
   *   counts by.
   */
  decrementMany: (values: Iterable<V>, amount?: number) => void;

  /**
   * Clears all counts from the Histogram.
   */
  clear: () => void;
};

export const createHistogram = <V>(): Histogram<V> => {
  const counts = new Map<V, number>();

  const getCount: Histogram<V>['getCount'] = (value) => counts.get(value) ?? 0;

  const increment: Histogram<V>['increment'] = (value, amount) => {
    const newCount =
      getCount(value) + (amount == null ? 1 : Math.round(amount));
    if (newCount <= 0) {
      counts.delete(value);
      return 0;
    } else {
      counts.set(value, newCount);
      return newCount;
    }
  };

  const incrementMany: Histogram<V>['incrementMany'] = (values, amount) => {
    for (const value of values) {
      increment(value, amount);
    }
  };

  const decrement: Histogram<V>['decrement'] = (value, amount) =>
    increment(value, amount == null ? -1 : -amount);

  const decrementMany: Histogram<V>['decrementMany'] = (values, amount) => {
    for (const value of values) {
      decrement(value, amount);
    }
  };

  const entries: Histogram<V>['entries'] = () => {
    return counts.entries();
  };

  const clear: Histogram<V>['clear'] = () => {
    counts.clear();
  };

  return {
    getCount,
    increment,
    incrementMany,
    decrement,
    decrementMany,
    entries,
    clear,
  };
};
