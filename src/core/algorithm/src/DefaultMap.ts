/**
 * DefaultMap behaves exactly the same as an ordinary map *except* that
 * accessing an unset key will set and return a default value.
 *
 * This is inspired by python's `defaultdict`.
 */
export type DefaultMap<K, V> = Omit<Map<K, V>, 'get'> & {
  get: (key: K) => V;
};

/**
 * Creates a new `DefaultMap`.
 *
 * @param initialValue - The initial contents of the default map.
 * @param defaultValueFactory - A factory for creating default values used when
 *   an unset key is accessed.
 *
 * @returns A new default map.
 */
export const createDefaultMap = <K, V>(
  defaultValueFactory: (key: K) => V,
  entries?: Iterable<[K, V]>,
): DefaultMap<K, V> => {
  const map = new Map<K, V>(entries);

  return Object.assign(map, {
    get: (key: K): V => {
      if (!map.has(key)) {
        const value = defaultValueFactory(key);
        map.set(key, value);
        return value;
      }

      // Typically `Map.get` returns `V | undefined`, but because we've already
      // ensured that the key *does* exist in the map, we can safely cast to
      // just `V`.
      return Map.prototype.get.call(map, key) as V;
    },
  });
};
