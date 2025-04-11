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
const time = __importStar(require("../index"));
describe('toString', () => {
    it('supports milliseconds.', () => {
        expect(time.duration.toString({ milliseconds: 5 })).toStrictEqual('5ms');
    });
    it('supports seconds', () => {
        expect(time.duration.toString({ seconds: 5 })).toStrictEqual('5s');
    });
    it('supports minutes', () => {
        expect(time.duration.toString({ minutes: 5 })).toStrictEqual('5m');
    });
    it('supports hours', () => {
        expect(time.duration.toString({ hours: 5 })).toStrictEqual('5h');
    });
    it('supports days', () => {
        expect(time.duration.toString({ days: 5 })).toStrictEqual('5d');
    });
});
