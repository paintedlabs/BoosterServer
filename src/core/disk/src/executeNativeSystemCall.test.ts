import * as status from '@core/status';

import * as disk from './index';

describe('executeNativeSystemCall', () => {
  it('returns the callback response if no errors are thrown.', async () => {
    expect(
      status.throwIfError(await disk.executeNativeSystemCall(() => 100)),
    ).toBe(100);
  });

  it('represents errors with no code as UnknownError', async () => {
    expect(
      await disk.executeNativeSystemCall(() => {
        throw new Error('An unknown error.');
      }),
    ).toMatchObject({
      error: {
        type: disk.ErrorType.UNKNOWN,
      },
    });
  });

  it('represents errors with unrecognized code as UnknownError', async () => {
    expect(
      await disk.executeNativeSystemCall(() => {
        throw makeErrorWithCode('Expected error.', 'FAKE_CODE');
      }),
    ).toMatchObject({
      error: {
        type: disk.ErrorType.UNKNOWN,
      },
    });
  });

  it.each([
    'EACCES',
    'EEXIST',
    'EISDIR',
    'EMFILE',
    'ENOENT',
    'ENOTDIR',
    'ENOTEMPTY',
    'EPERM',
  ])('represents errors with code "%s" as SystemError', async (code) => {
    expect(
      await disk.executeNativeSystemCall(() => {
        throw makeErrorWithCode('Expected error.', code);
      }),
    ).toMatchObject({
      error: {
        type: disk.ErrorType.SYSTEM,
        code,
      },
    });
  });
});

const makeErrorWithCode = (message: string, code: string): Error => {
  const error = new Error(message);
  (error as unknown as { code: string }).code = code;
  return error;
};
