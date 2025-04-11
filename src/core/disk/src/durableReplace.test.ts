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

beforeEach(() => {
  testFile = nodePath.join(nodeOs.tmpdir(), uuid.v4());
});

afterEach(async () => {
  await nodeFs.rm(testFile);
});

describe('durableReplace', () => {
  it('correctly uses fsync and atomic replace.', async () => {
    let parentDirectoryFileHandleSyncSpy!: jest.SpyInstance;
    jest.spyOn(nodeFs, 'open').mockImplementationOnce(async (...args) => {
      const handle = await nodeFs.open(...args);
      parentDirectoryFileHandleSyncSpy = jest.spyOn(handle, 'sync');
      return handle;
    });

    status.throwIfError(
      await disk.durableReplace({
        path: testFile,
        contents: 'foo',
      }),
    );

    // Validate that the path was replaced with the contents 'foo'.
    expect(await nodeFs.readFile(testFile, { encoding: 'utf8' })).toBe('foo');

    // Validate that only a single write occured to a temporary file with the
    // `fsync` flag enabled.
    expect(nodeFs.writeFile).toHaveBeenCalledTimes(1);
    expect(nodeFs.writeFile).toHaveBeenCalledWith(
      expect.not.stringMatching(testFile),
      'foo',
      {
        flag:
          nodeFs.constants.O_SYNC |
          nodeFs.constants.O_CREAT |
          nodeFs.constants.O_WRONLY,
      },
    );

    // Validate that the parent directory was opened and fsync'd.
    expect(nodeFs.open).toHaveBeenCalledWith(
      nodePath.dirname(testFile),
      nodeFs.constants.O_DIRECTORY,
    );
    expect(parentDirectoryFileHandleSyncSpy).toHaveBeenCalledTimes(1);
  });
});
