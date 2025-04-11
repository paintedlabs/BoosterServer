import * as nodeFs from 'node:fs/promises';
import * as nodePath from 'node:path';

import * as status from '@core/status';

import * as errors from './errors';
import { executeNativeSystemCall } from './executeNativeSystemCall';
import { doInTempDirectory } from './makeTempDirectory';

export type DurableReplaceOptions = {
  // The path to the file to be replaced.
  path: string;

  // The new contents to write to the file.
  contents: string | NodeJS.ArrayBufferView;

  // Each call to `durableReplace` requires opening and fsync'ing the `path`'s
  // parent directory. Clients which repeatedly replace files in a common
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
 * Replaces the contents of a file durably, ensuring data integrity even in the
 * event of power loss or system crashes.
 *
 * @param options - Configuration options.
 *
 * @return A status object indicating success or failure.
 */
export const durableReplace = async (
  options: DurableReplaceOptions,
): Promise<status.Status<errors.SystemError | errors.UnknownError>> => {
  const { path, contents, parentDirectory } = options;

  /// Writing a file durably requires careful management. In particular there
  /// are two scenarios we need to guard against.
  ///
  /// 1. Power loss during the write, resulting in a partial write.
  /// 2. Power loss after the write, when the OS's data buffers are filled but
  ///    the file hasn't been committed to disk, resulting in a partial or lost
  ///    write.
  ///
  /// To achieve durability:
  ///
  /// - The file is first written to a temporary location.
  /// - `fsync` is used to ensure data is committed to non-volatile memory.
  /// - The temporary file is atomically moved to its final destination.
  /// - `fsync` is used to ensure directory metadata changes are committed to
  ///   non-volatile memory.

  const makeDirectoryResult = await doInTempDirectory(
    async (tempDirectory) => {
      const tempFile = nodePath.join(tempDirectory, 'staging');

      // Write the file contents to a temporary file, and ensure `fsync` is
      // called to commit the data to non-volatile memory.
      const writeResult = await executeNativeSystemCall(() =>
        nodeFs.writeFile(tempFile, contents, {
          flag:
            nodeFs.constants.O_SYNC |
            nodeFs.constants.O_CREAT |
            nodeFs.constants.O_WRONLY,
        }),
      );
      if (!status.isOk(writeResult)) {
        return writeResult;
      }

      // Atomically move the temporary file to its final destination.
      const renameResult = await executeNativeSystemCall(() =>
        nodeFs.rename(tempFile, path),
      );
      if (!status.isOk(renameResult)) {
        return renameResult;
      }

      /// Ensure `fsync` is called on the destination directory to flush
      /// directory metadata changes to non-volatile memory.

      if (parentDirectory != null) {
        return status.stripValue(
          await executeNativeSystemCall(() => parentDirectory.sync()),
        );
      }

      const maybeParentDirectoryFileHandle = await executeNativeSystemCall(
        () =>
          nodeFs.open(nodePath.dirname(path), nodeFs.constants.O_DIRECTORY),
      );
      if (!status.isOk(maybeParentDirectoryFileHandle)) {
        return maybeParentDirectoryFileHandle;
      }
      const parentDirectoryFileHandle = maybeParentDirectoryFileHandle.value;

      try {
        return status.stripValue(
          await executeNativeSystemCall(() =>
            parentDirectoryFileHandle.sync(),
          ),
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

      return status.okStatus();
    },
  );
  if (!status.isOk(makeDirectoryResult)) {
    return makeDirectoryResult;
  }
  return makeDirectoryResult.value;
};
