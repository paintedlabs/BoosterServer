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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const status = __importStar(require("@core/status"));
const jest_fetch_mock_1 = __importDefault(require("jest-fetch-mock"));
const net = __importStar(require("./index"));
beforeAll(() => {
    jest_fetch_mock_1.default.enableMocks();
});
afterAll(() => {
    jest_fetch_mock_1.default.disableMocks();
});
describe('fetchBody', () => {
    it('returns a failure if fetch throws an exception.', async () => {
        jest_fetch_mock_1.default.mockOnce(async () => {
            throw new Error('some error');
        });
        expect(await net.fetchBody('http://fake.com')).toMatchObject({
            error: {
                type: net.ErrorType.UNKNOWN,
            },
        });
    });
    it('returns a status failure if the response has a non-200 code despite a body.', async () => {
        jest_fetch_mock_1.default.mockOnce(async () => ({
            status: 404,
            body: 'Not Found',
        }));
        expect(await net.fetchBody('http://fake.com')).toMatchObject({
            error: {
                type: net.ErrorType.UNEXPECTED_STATUS,
            },
        });
    });
    it('returns a status failure if the response has a non-200 code and no body.', async () => {
        jest_fetch_mock_1.default.mockOnce(async () => ({
            status: 203,
        }));
        expect(await net.fetchBody('http://fake.com')).toMatchObject({
            error: {
                type: net.ErrorType.UNEXPECTED_STATUS,
            },
        });
    });
    it('returns a failure if the response is missing a body.', async () => {
        jest_fetch_mock_1.default.mockOnce(async () => ({
            status: 200,
            body: undefined,
        }));
        expect(await net.fetchBody('http://fake.com')).toMatchObject({
            error: {
                type: net.ErrorType.NO_CONTENT,
            },
        });
    });
    it('returns an existing body if 200 status.', async () => {
        jest_fetch_mock_1.default.mockOnce(async () => ({
            status: 200,
            body: 'Fake Content',
        }));
        expect(status.throwIfError(await net.fetchBody('http://fake.com'))).toEqual('Fake Content');
    });
});
