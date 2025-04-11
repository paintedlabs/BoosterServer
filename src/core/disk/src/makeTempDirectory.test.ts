import * as nodeFs from 'node:fs';
import * as nodeOs from 'node:os';
import * as nodePath from 'node:path';

import * as status from '@core/status';
import * as uuid from 'uuid';

import * as disk from './index';

describe('makeTempDirectory', () => {
  it(`by default allocates directories in the os's tmp nodePath.`, async () => {
    const tempDirectory = status.throwIfError(await disk.makeTempDirectory());

    expect(tempDirectory.startsWith(`${nodeOs.tmpdir()}/`)).toBe(true);
  });

  it('can set a custom tmp directory prefix.', async () => {
    const customDirectory = `${nodeOs.tmpdir()}/${uuid.v4()}`;

    const tempDirectory = status.throwIfError(
      await disk.makeTempDirectory({
        parentDirectory: customDirectory,
      }),
    );

    expect(tempDirectory.startsWith(`${customDirectory}/`)).toBe(true);
  });

  it('Allocates an accessible directory.', async () => {
    await expect(
      nodeFs.promises.access(
        status.throwIfError(await disk.makeTempDirectory()),
      ),
    ).resolves.not.toThrow();
  });
});

describe('doInTempDirectory', () => {
  it(`By default allocates directories in the os's nodePath.`, async () => {
    const handler = jest.fn((tempDirectory: string) => {
      expect(nodePath.dirname(tempDirectory)).toEqual(nodeOs.tmpdir());
      return status.okStatus();
    });

    status.throwIfError(await disk.doInTempDirectory(handler));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('Can set custom tmp directory prefix.', async () => {
    const customDirectory = `${nodeOs.tmpdir()}/${uuid.v4()}`;
    const handler = jest.fn((tempDirectory: string) => {
      expect(nodePath.dirname(tempDirectory)).toEqual(customDirectory);
      return status.okStatus();
    });

    status.throwIfError(
      await disk.doInTempDirectory(handler, {
        parentDirectory: customDirectory,
      }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('Allocates an accessible directory.', async () => {
    const handler = jest.fn(async (tempDirectory: string) => {
      await expect(
        nodeFs.promises.access(tempDirectory),
      ).resolves.not.toThrow();
      return status.okStatus();
    });

    status.throwIfError(await disk.doInTempDirectory(handler));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('Deletes the directory after the handler resolves.', async () => {
    let savedTempDirectory: string | null = null;
    status.throwIfError(
      await disk.doInTempDirectory(async (tempDirectory) => {
        savedTempDirectory = tempDirectory;
        await expect(
          nodeFs.promises.access(tempDirectory),
        ).resolves.not.toThrow();
        return status.okStatus();
      }),
    );

    if (savedTempDirectory == null) {
      throw new Error('savedTempDirectory is unset');
    }
    await expect(nodeFs.promises.access(savedTempDirectory)).rejects.toThrow();
  });

  it('returns the handler response.', async () => {
    expect(await disk.doInTempDirectory(() => 100)).toStrictEqual(
      status.fromValue(100),
    );

    expect(
      status.throwIfError(
        await disk.doInTempDirectory(() =>
          status.fromError('Expected error.'),
        ),
      ),
    ).toMatchObject({
      error: 'Expected error.',
    });
  });
});
