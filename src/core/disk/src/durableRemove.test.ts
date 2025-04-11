import * as nodeFs from 'node:fs/promises';
import * as nodeOs from 'node:os';
import * as nodePath from 'node:path';

import * as status from '@core/status';
import * as jestMockModule from 'jest-mock-module';
import * as uuid from 'uuid';

import * as disk from './index';

jestMockModule.extend(jest);

jest.spy('node:fs/promises');

let testFile: string;

beforeEach(async () => {
  testFile = nodePath.join(nodeOs.tmpdir(), uuid.v4());
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('durableRemove', () => {
  it('correctly syncs the parent directory when not provided.', async () => {
    // Initialize the test file with some data.
    await nodeFs.writeFile(testFile, 'test data');

    let parentDirectoryFileHandleSyncSpy!: jest.SpyInstance;
    jest.spyOn(nodeFs, 'open').mockImplementationOnce(async (...args) => {
      const handle = await nodeFs.open(...args);
      parentDirectoryFileHandleSyncSpy = jest.spyOn(handle, 'sync');
      return handle;
    });

    status.throwIfError(await disk.durableRemove({ path: testFile }));

    // Validate that the file was removed.
    expect(nodeFs.rm).toHaveBeenCalledTimes(1);
    expect(nodeFs.rm).toHaveBeenCalledWith(testFile);

    // Validate that the parent directory was opened and fsync'd.
    expect(nodeFs.open).toHaveBeenCalledWith(
      nodePath.dirname(testFile),
      nodeFs.constants.O_DIRECTORY,
    );
    expect(parentDirectoryFileHandleSyncSpy).toHaveBeenCalledTimes(1);
  });

  it('early exits when the removal fails.', async () => {
    expect(await disk.durableRemove({ path: testFile })).toMatchObject({
      error: {
        type: disk.ErrorType.SYSTEM,
        code: disk.SystemErrorCode.ENOENT,
      },
    });

    // Validate that a removal was attempted.
    expect(nodeFs.rm).toHaveBeenCalledTimes(1);
    expect(nodeFs.rm).toHaveBeenCalledWith(testFile);

    // Validate that the parent directory was never fsync'd.
    expect(nodeFs.open).toHaveBeenCalledTimes(0);
  });
});
