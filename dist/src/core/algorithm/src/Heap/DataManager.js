"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDataManager = void 0;
const createDataManager = () => {
    const data = [];
    // Tracks the index for each value stored in `data`.
    //
    // This is critical to support efficient removal of values from `data`. During
    // normal operation, entries in `data` may be moved around via `swap`. As a
    // result, for removal we need an efficient way to query the current index for
    // any given entry.
    const locations = new WeakMap();
    const push = (value) => {
        const entry = {
            get value() {
                return value;
            },
            get index() {
                return getIndex();
            },
            remove: () => {
                return remove(getIndex()) != null;
            },
            get removed() {
                return getIndex() === -1;
            },
        };
        const getIndex = () => {
            const location = locations.get(entry);
            if (location == null || data[location] !== entry) {
                return -1;
            }
            return location;
        };
        data.push(entry);
        locations.set(entry, data.length - 1);
        return entry;
    };
    const get = (index) => {
        if (index < 0 || index >= data.length) {
            return null;
        }
        return data[index];
    };
    const remove = (index) => {
        if (index < 0 || index >= data.length) {
            return null;
        }
        if (index === data.length - 1) {
            const entry = data[index];
            locations.delete(entry);
            --data.length;
            return entry;
        }
        swap(index, data.length - 1);
        return remove(data.length - 1);
    };
    const swap = (a, b) => {
        if (a < 0 || a >= data.length || b < 0 || b >= data.length) {
            return false;
        }
        else if (a === b) {
            return true;
        }
        const temp = data[a];
        data[a] = data[b];
        data[b] = temp;
        locations.set(data[a], a);
        locations.set(data[b], b);
        return true;
    };
    return {
        push,
        get,
        remove,
        swap,
        get size() {
            return data.length;
        },
    };
};
exports.createDataManager = createDataManager;
