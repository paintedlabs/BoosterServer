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
const dataManager = __importStar(require("./DataManager"));
describe('DataManager', () => {
    it('can remove data from the tail', () => {
        var _a, _b, _c;
        const data = dataManager.createDataManager();
        data.push(100);
        data.push(200);
        data.push(300);
        expect(data.size).toBe(3);
        expect((_a = data.remove(2)) === null || _a === void 0 ? void 0 : _a.value).toBe(300);
        expect(data.size).toBe(2);
        expect((_b = data.remove(1)) === null || _b === void 0 ? void 0 : _b.value).toBe(200);
        expect(data.size).toBe(1);
        expect((_c = data.remove(0)) === null || _c === void 0 ? void 0 : _c.value).toBe(100);
        expect(data.size).toBe(0);
    });
    it('can remove data from the head', () => {
        var _a, _b, _c;
        const data = dataManager.createDataManager();
        data.push(100);
        data.push(200);
        data.push(300);
        expect(data.size).toBe(3);
        expect((_a = data.remove(0)) === null || _a === void 0 ? void 0 : _a.value).toBe(100);
        expect(data.size).toBe(2);
        expect((_b = data.remove(0)) === null || _b === void 0 ? void 0 : _b.value).toBe(300);
        expect(data.size).toBe(1);
        expect((_c = data.remove(0)) === null || _c === void 0 ? void 0 : _c.value).toBe(200);
        expect(data.size).toBe(0);
    });
    it('can swap values', () => {
        var _a, _b, _c, _d, _e, _f;
        const data = dataManager.createDataManager();
        data.push(100);
        data.push(200);
        data.push(300);
        data.swap(0, 2);
        expect((_a = data.get(0)) === null || _a === void 0 ? void 0 : _a.value).toBe(300);
        expect((_b = data.get(1)) === null || _b === void 0 ? void 0 : _b.value).toBe(200);
        expect((_c = data.get(2)) === null || _c === void 0 ? void 0 : _c.value).toBe(100);
        data.swap(1, 2);
        expect((_d = data.get(0)) === null || _d === void 0 ? void 0 : _d.value).toBe(300);
        expect((_e = data.get(1)) === null || _e === void 0 ? void 0 : _e.value).toBe(100);
        expect((_f = data.get(2)) === null || _f === void 0 ? void 0 : _f.value).toBe(200);
    });
    it('can remove using the entry', () => {
        var _a, _b, _c;
        const data = dataManager.createDataManager();
        const entry100 = data.push(100);
        const entry200 = data.push(200);
        const entry300 = data.push(300);
        expect(data.size).toBe(3);
        expect(entry200.remove()).toBe(true);
        expect(data.size).toBe(2);
        expect((_a = data.get(0)) === null || _a === void 0 ? void 0 : _a.value).toBe(100);
        expect((_b = data.get(1)) === null || _b === void 0 ? void 0 : _b.value).toBe(300);
        expect(entry100.remove()).toBe(true);
        expect(data.size).toBe(1);
        expect((_c = data.get(0)) === null || _c === void 0 ? void 0 : _c.value).toBe(300);
        expect(entry300.remove()).toBe(true);
        expect(data.size).toBe(0);
    });
    it('correctly removes after swap', () => {
        var _a, _b;
        const data = dataManager.createDataManager();
        data.push(100);
        const entry200 = data.push(200);
        data.push(300);
        expect(data.size).toBe(3);
        data.swap(0, 1);
        expect(entry200.remove()).toBe(true);
        expect(data.size).toBe(2);
        expect((_a = data.get(0)) === null || _a === void 0 ? void 0 : _a.value).toBe(300);
        expect((_b = data.get(1)) === null || _b === void 0 ? void 0 : _b.value).toBe(100);
    });
    it('guards against removing an entry multiple times', () => {
        const data = dataManager.createDataManager();
        const entry = data.push(100);
        expect(data.size).toBe(1);
        expect(entry.removed).toBe(false);
        expect(entry.index).toBe(0);
        expect(entry.remove()).toBe(true);
        expect(entry.removed).toBe(true);
        expect(entry.index).toBe(-1);
        expect(data.size).toBe(0);
        expect(entry.remove()).toBe(false);
    });
});
