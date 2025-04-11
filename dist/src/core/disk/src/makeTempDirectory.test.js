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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodeFs = __importStar(require("node:fs"));
const nodeOs = __importStar(require("node:os"));
const nodePath = __importStar(require("node:path"));
const status = __importStar(require("@core/status"));
const uuid = __importStar(require("uuid"));
const disk = __importStar(require("./index"));
describe('makeTempDirectory', () => {
    it(`by default allocates directories in the os's tmp nodePath.`, () => __awaiter(void 0, void 0, void 0, function* () {
        const tempDirectory = status.throwIfError(yield disk.makeTempDirectory());
        expect(tempDirectory.startsWith(`${nodeOs.tmpdir()}/`)).toBe(true);
    }));
    it('can set a custom tmp directory prefix.', () => __awaiter(void 0, void 0, void 0, function* () {
        const customDirectory = `${nodeOs.tmpdir()}/${uuid.v4()}`;
        const tempDirectory = status.throwIfError(yield disk.makeTempDirectory({
            parentDirectory: customDirectory,
        }));
        expect(tempDirectory.startsWith(`${customDirectory}/`)).toBe(true);
    }));
    it('Allocates an accessible directory.', () => __awaiter(void 0, void 0, void 0, function* () {
        yield expect(nodeFs.promises.access(status.throwIfError(yield disk.makeTempDirectory()))).resolves.not.toThrow();
    }));
});
describe('doInTempDirectory', () => {
    it(`By default allocates directories in the os's nodePath.`, () => __awaiter(void 0, void 0, void 0, function* () {
        const handler = jest.fn((tempDirectory) => {
            expect(nodePath.dirname(tempDirectory)).toEqual(nodeOs.tmpdir());
            return status.okStatus();
        });
        status.throwIfError(yield disk.doInTempDirectory(handler));
        expect(handler).toHaveBeenCalledTimes(1);
    }));
    it('Can set custom tmp directory prefix.', () => __awaiter(void 0, void 0, void 0, function* () {
        const customDirectory = `${nodeOs.tmpdir()}/${uuid.v4()}`;
        const handler = jest.fn((tempDirectory) => {
            expect(nodePath.dirname(tempDirectory)).toEqual(customDirectory);
            return status.okStatus();
        });
        status.throwIfError(yield disk.doInTempDirectory(handler, {
            parentDirectory: customDirectory,
        }));
        expect(handler).toHaveBeenCalledTimes(1);
    }));
    it('Allocates an accessible directory.', () => __awaiter(void 0, void 0, void 0, function* () {
        const handler = jest.fn((tempDirectory) => __awaiter(void 0, void 0, void 0, function* () {
            yield expect(nodeFs.promises.access(tempDirectory)).resolves.not.toThrow();
            return status.okStatus();
        }));
        status.throwIfError(yield disk.doInTempDirectory(handler));
        expect(handler).toHaveBeenCalledTimes(1);
    }));
    it('Deletes the directory after the handler resolves.', () => __awaiter(void 0, void 0, void 0, function* () {
        let savedTempDirectory = null;
        status.throwIfError(yield disk.doInTempDirectory((tempDirectory) => __awaiter(void 0, void 0, void 0, function* () {
            savedTempDirectory = tempDirectory;
            yield expect(nodeFs.promises.access(tempDirectory)).resolves.not.toThrow();
            return status.okStatus();
        })));
        if (savedTempDirectory == null) {
            throw new Error('savedTempDirectory is unset');
        }
        yield expect(nodeFs.promises.access(savedTempDirectory)).rejects.toThrow();
    }));
    it('returns the handler response.', () => __awaiter(void 0, void 0, void 0, function* () {
        expect(yield disk.doInTempDirectory(() => 100)).toStrictEqual(status.fromValue(100));
        expect(status.throwIfError(yield disk.doInTempDirectory(() => status.fromError('Expected error.')))).toMatchObject({
            error: 'Expected error.',
        });
    }));
});
