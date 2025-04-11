import * as nodeFs from 'node:fs/promises';
import * as nodePath from 'node:path';

import * as status from '@core/status';

import * as errors from './errors';
import { executeNativeSystemCall } from './executeNativeSystemCall';

export type DurableRemoveOptions = {
  // The path of the file to be removed.
  path: string;

  // Each call to `durableRemove` requires opening and fsync'ing the `path`'s
  // parent directory. Clients which repeatedly modify files in a common
  // directory may wish to reserve a file handle to improve performance. If
  // provided, this file handle will be fsync'd rather than opening a new
  // handle.
  //
  // *Warning:* This option is *not* validated, clients must correctly provide
  // the correct parent directory handle or durability guarantees may not be
  // met.
  parentDirectory?: nodeFs.FileHandle;
};

/**
 * Removes a file durably, ensuring data integrity even in the event of power
 * loss or system crashes.
 *
 * @param options - Configuration options.
 *
 * @return A status object indicating success or failure.
 */
export const durableRemove = async (
  options: DurableRemoveOptions,
): Promise<status.Status<errors.SystemError | errors.UnknownError>> => {
  const { path, parentDirectory } = options;

  const removeResult = await executeNativeSystemCall(() => nodeFs.rm(path));
  if (!status.isOk(removeResult)) {
    return removeResult;
  }

  if (parentDirectory != null) {
    return status.stripValue(
      await executeNativeSystemCall(() => parentDirectory.sync()),
    );
  }

  const maybeParentDirectoryFileHandle = await executeNativeSystemCall(() =>
    nodeFs.open(nodePath.dirname(path), nodeFs.constants.O_DIRECTORY),
  );
  if (!status.isOk(maybeParentDirectoryFileHandle)) {
    return maybeParentDirectoryFileHandle;
  }
  const parentDirectoryFileHandle = maybeParentDirectoryFileHandle.value;

  try {
    return status.stripValue(
      await executeNativeSystemCall(() => parentDirectoryFileHandle.sync()),
    );
  } finally {
    const closeResult = await executeNativeSystemCall(() =>
      parentDirectoryFileHandle.close(),
    );
    if (!status.isOk(closeResult)) {
      console.warn(
        `Failed to close file handle for ${nodePath.dirname(path)}`,
      );
    }
  }
};
