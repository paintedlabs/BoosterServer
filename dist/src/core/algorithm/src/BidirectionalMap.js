"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBidirectionalMap = void 0;
const createBidirectionalMap = (entries) => {
    const keyToValue = new Map();
    const valueToKey = new Map();
    const link = (key, value) => {
        const removedLinks = [];
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
    const hasKey = (key) => keyToValue.has(key);
    const hasValue = (value) => valueToKey.has(value);
    const getKey = (value) => valueToKey.get(value);
    const getValue = (key) => keyToValue.get(key);
    const deleteKey = (key) => {
        if (!hasKey(key)) {
            return;
        }
        const value = getValue(key);
        keyToValue.delete(key);
        valueToKey.delete(value);
        return [key, value];
    };
    const deleteValue = (value) => {
        if (!hasValue(value)) {
            return;
        }
        const key = getKey(value);
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
exports.createBidirectionalMap = createBidirectionalMap;
