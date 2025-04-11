"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultMap = void 0;
/**
 * Creates a new `DefaultMap`.
 *
 * @param initialValue - The initial contents of the default map.
 * @param defaultValueFactory - A factory for creating default values used when
 *   an unset key is accessed.
 *
 * @returns A new default map.
 */
const createDefaultMap = (defaultValueFactory, entries) => {
    const map = new Map(entries);
    return Object.assign(map, {
        get: (key) => {
            if (!map.has(key)) {
                const value = defaultValueFactory(key);
                map.set(key, value);
                return value;
            }
            // Typically `Map.get` returns `V | undefined`, but because we've already
            // ensured that the key *does* exist in the map, we can safely cast to
            // just `V`.
            return Map.prototype.get.call(map, key);
        },
    });
};
exports.createDefaultMap = createDefaultMap;
