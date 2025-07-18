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
const nodeFs = __importStar(require("node:fs"));
const nodeOs = __importStar(require("node:os"));
const nodePath = __importStar(require("node:path"));
const status = __importStar(require("@core/status"));
const uuid = __importStar(require("uuid"));
const disk = __importStar(require("./index"));
describe('makeTempDirectory', () => {
    it(`by default allocates directories in the os's tmp nodePath.`, async () => {
        const tempDirectory = status.throwIfError(await disk.makeTempDirectory());
        expect(tempDirectory.startsWith(`${nodeOs.tmpdir()}/`)).toBe(true);
    });
    it('can set a custom tmp directory prefix.', async () => {
        const customDirectory = `${nodeOs.tmpdir()}/${uuid.v4()}`;
        const tempDirectory = status.throwIfError(await disk.makeTempDirectory({
            parentDirectory: customDirectory,
        }));
        expect(tempDirectory.startsWith(`${customDirectory}/`)).toBe(true);
    });
    it('Allocates an accessible directory.', async () => {
        await expect(nodeFs.promises.access(status.throwIfError(await disk.makeTempDirectory()))).resolves.not.toThrow();
    });
});
describe('doInTempDirectory', () => {
    it(`By default allocates directories in the os's nodePath.`, async () => {
        const handler = jest.fn((tempDirectory) => {
            expect(nodePath.dirname(tempDirectory)).toEqual(nodeOs.tmpdir());
            return status.okStatus();
        });
        status.throwIfError(await disk.doInTempDirectory(handler));
        expect(handler).toHaveBeenCalledTimes(1);
    });
    it('Can set custom tmp directory prefix.', async () => {
        const customDirectory = `${nodeOs.tmpdir()}/${uuid.v4()}`;
        const handler = jest.fn((tempDirectory) => {
            expect(nodePath.dirname(tempDirectory)).toEqual(customDirectory);
            return status.okStatus();
        });
        status.throwIfError(await disk.doInTempDirectory(handler, {
            parentDirectory: customDirectory,
        }));
        expect(handler).toHaveBeenCalledTimes(1);
    });
    it('Allocates an accessible directory.', async () => {
        const handler = jest.fn(async (tempDirectory) => {
            await expect(nodeFs.promises.access(tempDirectory)).resolves.not.toThrow();
            return status.okStatus();
        });
        status.throwIfError(await disk.doInTempDirectory(handler));
        expect(handler).toHaveBeenCalledTimes(1);
    });
    it('Deletes the directory after the handler resolves.', async () => {
        let savedTempDirectory = null;
        status.throwIfError(await disk.doInTempDirectory(async (tempDirectory) => {
            savedTempDirectory = tempDirectory;
            await expect(nodeFs.promises.access(tempDirectory)).resolves.not.toThrow();
            return status.okStatus();
        }));
        if (savedTempDirectory == null) {
            throw new Error('savedTempDirectory is unset');
        }
        await expect(nodeFs.promises.access(savedTempDirectory)).rejects.toThrow();
    });
    it('returns the handler response.', async () => {
        expect(await disk.doInTempDirectory(() => 100)).toStrictEqual(status.fromValue(100));
        expect(status.throwIfError(await disk.doInTempDirectory(() => status.fromError('Expected error.')))).toMatchObject({
            error: 'Expected error.',
        });
    });
});
