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
describe('toMilliseconds', () => {
    it('Can convert from milliseconds', () => {
        expect(time.duration.toMilliseconds({ milliseconds: 1 })).toStrictEqual(1);
    });
    it('Can convert from seconds', () => {
        expect(time.duration.toMilliseconds({ seconds: 1 })).toStrictEqual(1000);
    });
    it('Can convert from minutes', () => {
        expect(time.duration.toMilliseconds({ minutes: 1 })).toStrictEqual(60000);
    });
    it('Can convert from hours', () => {
        expect(time.duration.toMilliseconds({ hours: 1 })).toStrictEqual(3.6e6);
    });
    it('Can convert from days', () => {
        expect(time.duration.toMilliseconds({ days: 1 })).toStrictEqual(8.64e7);
    });
});
describe('toSeconds', () => {
    it('Can convert from milliseconds', () => {
        expect(time.duration.toSeconds({ milliseconds: 1000 })).toStrictEqual(1);
    });
    it('Can convert from seconds', () => {
        expect(time.duration.toSeconds({ seconds: 1 })).toStrictEqual(1);
    });
    it('Can convert from minutes', () => {
        expect(time.duration.toSeconds({ minutes: 1 })).toStrictEqual(60);
    });
    it('Can convert from hours', () => {
        expect(time.duration.toSeconds({ hours: 1 })).toStrictEqual(3600);
    });
    it('Can convert from days', () => {
        expect(time.duration.toSeconds({ days: 1 })).toStrictEqual(86400);
    });
});
describe('toMinutes', () => {
    it('Can convert from milliseconds', () => {
        expect(time.duration.toMinutes({ milliseconds: 60000 })).toStrictEqual(1);
    });
    it('Can convert from seconds', () => {
        expect(time.duration.toMinutes({ seconds: 60 })).toStrictEqual(1);
    });
    it('Can convert from minutes', () => {
        expect(time.duration.toMinutes({ minutes: 1 })).toStrictEqual(1);
    });
    it('Can convert from hours', () => {
        expect(time.duration.toMinutes({ hours: 1 })).toStrictEqual(60);
    });
    it('Can convert from days', () => {
        expect(time.duration.toMinutes({ days: 1 })).toStrictEqual(1440);
    });
});
describe('toHours', () => {
    it('Can convert from milliseconds', () => {
        expect(time.duration.toHours({ milliseconds: 3.6e6 })).toStrictEqual(1);
    });
    it('Can convert from seconds', () => {
        expect(time.duration.toHours({ seconds: 3600 })).toStrictEqual(1);
    });
    it('Can convert from minutes', () => {
        expect(time.duration.toHours({ minutes: 60 })).toStrictEqual(1);
    });
    it('Can convert from hours', () => {
        expect(time.duration.toHours({ hours: 1 })).toStrictEqual(1);
    });
    it('Can convert from days', () => {
        expect(time.duration.toHours({ days: 1 })).toStrictEqual(24);
    });
});
describe('toDays', () => {
    it('Can convert from milliseconds', () => {
        expect(time.duration.toDays({ milliseconds: 86400000 })).toStrictEqual(1);
    });
    it('Can convert from seconds', () => {
        expect(time.duration.toDays({ seconds: 86400 })).toStrictEqual(1);
    });
    it('Can convert from minutes', () => {
        expect(time.duration.toDays({ minutes: 1440 })).toStrictEqual(1);
    });
    it('Can convert from hours', () => {
        expect(time.duration.toDays({ hours: 24 })).toStrictEqual(1);
    });
    it('Can convert from days', () => {
        expect(time.duration.toDays({ days: 1 })).toStrictEqual(1);
    });
});
