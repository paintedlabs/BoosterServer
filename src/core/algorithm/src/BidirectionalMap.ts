/**
 * A bidirectional map is an associative data structure in which key-value pairs
 * have one-to-one correspondence. This means that a key can be paired with
 * exactly one value, and a value can be paired with exactly one key.
 *
 * @see https://en.wikipedia.org/wiki/Bidirectional_map
 */
export type BidirectionalMap<K, V> = {
  /**
   * Adds a new key-value pair to the data structure.
   *
   * Note that any existing links between the key or the value will be removed
   * to maintain one-to-one correspondence between keys and values.
   *
   * @param key - The key.
   * @param value - The value.
   *
   * @returns Any linkages removed in the process of adding this key-value pair.
   */
  link: (key: K, value: V) => Array<[K, V]>;

  hasKey: (key: K) => boolean;
  hasValue: (value: V) => boolean;

  getKey: (value: V) => K | undefined;
  getValue: (key: K) => V | undefined;

  /**
   * Deletes the key-value pair represented by `key`.
   *
   * @returns boolean If any data was actually removed from the map.
   */
  deleteKey: (key: K) => [K, V] | undefined;

  /**
   * Deletes the key-value pair represented by `value`.
   *
   * @returns boolean If any data was actually removed from the map.
   */
  deleteValue: (value: V) => [K, V] | undefined;

  entries: () => IterableIterator<[K, V]>;
  keys: () => IterableIterator<K>;
  values: () => IterableIterator<V>;

  /**
   * The current number of key-value pairs in the map.
   */
  readonly size: number;
};

export const createBidirectionalMap = <K, V>(
  entries?: Iterable<[K, V]>,
): BidirectionalMap<K, V> => {
  const keyToValue = new Map<K, V>();
  const valueToKey = new Map<V, K>();

  const link: BidirectionalMap<K, V>['link'] = (key, value) => {
    const removedLinks: Array<[K, V]> = [];

    const removedKeyPair = deleteKey(key);
    if (removedKeyPair != null) {
      removedLinks.push(removedKeyPair);
    }

    const removedValuePair = deleteValue(value);
    if (removedValuePair != null) {
      removedLinks.push(removedValuePair);
    }

    keyToValue.set(key, value);
    valueToKey.set(value, key);

    return removedLinks;
  };

  const hasKey: BidirectionalMap<K, V>['hasKey'] = (key) =>
    keyToValue.has(key);

  const hasValue: BidirectionalMap<K, V>['hasValue'] = (value) =>
    valueToKey.has(value);

  const getKey: BidirectionalMap<K, V>['getKey'] = (value) =>
    valueToKey.get(value);

  const getValue: BidirectionalMap<K, V>['getValue'] = (key) =>
    keyToValue.get(key);

  const deleteKey: BidirectionalMap<K, V>['deleteKey'] = (key) => {
    if (!hasKey(key)) {
      return;
    }

    const value = getValue(key) as V;
    keyToValue.delete(key);
    valueToKey.delete(value);
    return [key, value];
  };

  const deleteValue: BidirectionalMap<K, V>['deleteValue'] = (value) => {
    if (!hasValue(value)) {
      return;
    }

    const key = getKey(value) as K;
    keyToValue.delete(key);
    valueToKey.delete(value);
    return [key, value];
  };

  if (entries) {
    for (const [key, value] of entries) {
      link(key, value);
    }
  }

  return {
    link,
    hasKey,
    hasValue,
    getKey,
    getValue,
    deleteKey,
    deleteValue,
    entries: () => keyToValue.entries(),
    keys: () => keyToValue.keys(),
    values: () => keyToValue.values(),
    get size() {
      return keyToValue.size;
    },
  };
};
