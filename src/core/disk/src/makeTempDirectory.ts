import * as nodeFs from 'node:fs/promises';
import * as nodeOs from 'node:os';
import * as nodePath from 'node:path';

import * as status from '@core/status';
import * as typesafety from '@core/typesafety';
import * as uuid from 'uuid';

import * as errors from './errors';
import { executeNativeSystemCall } from './executeNativeSystemCall';

export type MakeTempDirectoryOptions = {
  // The newly created temp directory will be a direct descendent of this
  // directory.
  //
  // Note that the OS's tmp directory has special behaviors such as
  // automatically cleaning up files after 10 days and always cleaning up on
  // machine restart. Using a custom parent directory is unlikely to share these
  // properties.
  //
  // Defaults to your OS's tmp directory.
  parentDirectory?: string;
};

/**
 * Creates a unique directory. By default it will be located within the OS's tmp
 * directory, however, this behavior can be modified with the options.
 *
 * Almost always prefer `doInTempDirectory` which ensures cleanup of temporary
 * directories unlike this method.
 *
 * @param options Additional optional parameters. See properties for details.
 *
 * @returns The string of the created temp directory.
 */
export const makeTempDirectory = async (
  options?: MakeTempDirectoryOptions,
): Promise<
  status.StatusOr<string, errors.SystemError | errors.UnknownError>
> => {
  const optionsWithDefaults: Required<MakeTempDirectoryOptions> = {
    parentDirectory: nodeOs.tmpdir(),
    ...options,
  };

  const absolutePath = nodePath.join(
    optionsWithDefaults.parentDirectory,
    uuid.v4(),
  );

  const maybeResult = await executeNativeSystemCall(() =>
    nodeFs.mkdir(absolutePath, { recursive: true }),
  );
  if (!status.isOk(maybeResult)) {
    return maybeResult;
  }

  return status.fromValue(absolutePath);
};

/**
 * Creates a tmp directory and automatically cleans up that tmp directory when
 * the logic using it resolves. It achieves this by accepting a lambda which is
 * supplied the directory and when the lambda returns, the directory will be
 * deleted.
 *
 * @param handler The logic to execute.
 * @param options Additional optional parameters. See properties for details.
 *
 * @returns A status which contains the handler's response or an error if a
 *   temporary directory couldn't be created.
 */
export const doInTempDirectory = async <R>(
  handler: (directoryAbsolutePath: string) => typesafety.AsyncOrSync<R>,
  options?: MakeTempDirectoryOptions,
): Promise<status.StatusOr<R, errors.SystemError | errors.UnknownError>> => {
  const maybeTempDirectory = await makeTempDirectory(options);
  if (!status.isOk(maybeTempDirectory)) {
    return maybeTempDirectory;
  }
  const tempDirectory = maybeTempDirectory.value;

  const response = await handler(tempDirectory);

  const maybeRemoved = await executeNativeSystemCall(() =>
    nodeFs.rm(tempDirectory, {
      recursive: true,
      force: true,
    }),
  );
  if (!status.isOk(maybeRemoved)) {
    console.warn(
      {
        directoryPath: tempDirectory,
        error: maybeRemoved,
      },
      'Failed to clean up temp directory.',
    );
  }

  return status.fromValue(response);
};
