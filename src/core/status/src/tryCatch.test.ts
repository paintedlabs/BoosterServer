import * as status from './index';

describe('toNativeError', () => {
  it('By default JSON serializes the ErrorStatusOr', () => {
    const error = status.toNativeError(status.fromError('foobar'));
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toStrictEqual('"foobar"');
  });

  it('Accepts a custom formatter', () => {
    const error = status.toNativeError(
      status.fromError('foobar'),
      (error) => `Custom formatted ${error}`,
    );
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toStrictEqual('Custom formatted foobar');
  });
});

describe('fromNativeError', () => {
  it('Uses the error message.', () => {
    const error = status.fromNativeError(new Error('foobar'));
    expect(status.isStatusOr(error)).toBe(true);
    expect(error.error).toStrictEqual('foobar');
  });

  it('Is symmetrical with toNativeError', () => {
    const error = status.fromNativeError(
      status.toNativeError(
        status.fromError('foobar'),
        (error) => `Custom formatted ${error}`,
      ),
    );
    expect(status.isStatusOr(error)).toBe(true);
    expect(error.error).toStrictEqual('foobar');
  });
});

describe('throwIfError', () => {
  it('throws if a statusOr is an error', () => {
    expect(() => status.throwIfError(status.fromError('error'))).toThrow();
  });

  it('returns the value if a statusOr is ok', () => {
    expect(status.throwIfError(status.fromValue(10))).toEqual(10);
  });
});
