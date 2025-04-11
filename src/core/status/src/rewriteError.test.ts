import * as status from './index';

describe('rewriteError', () => {
  it('Preserves the traceback.', () => {
    const originalError = status.fromError('foo');
    const rewrittenError = status.rewriteError(originalError, () => 'bar');
    expect(originalError.error).toEqual('foo');
    expect(rewrittenError.error).toEqual('bar');
    expect(originalError.traceback).toBe(rewrittenError.traceback);
  });

  it('Preserves retriable.', () => {
    const originalError = status.fromError('foo', { retriable: true });
    const rewrittenError = status.rewriteError(originalError, () => 'bar');
    expect(originalError.error).toEqual('foo');
    expect(originalError.retriable).toBe(true);
    expect(rewrittenError.error).toEqual('bar');
    expect(rewrittenError.retriable).toBe(true);
  });

  it('Records rewrites in the changelog.', () => {
    const originalError = status.fromError('foo');
    const rewrittenError = status.rewriteError(originalError, () => 'bar');
    expect(originalError.changelog).toStrictEqual([]);
    expect(rewrittenError.changelog).toStrictEqual([
      {
        type: status.ChangeEventType.REWRITE,
        rewrittenError: 'foo',
      },
    ]);
  });

  it('Multiple rewrites are correctly ordered in the changelog.', () => {
    let error = status.fromError('foo');
    error = status.rewriteError(error, () => 'bar');
    error = status.rewriteError(error, () => 'baz');
    error = status.rewriteError(error, () => 'qux');

    expect(error.error).toBe('qux');
    expect(error.changelog).toStrictEqual([
      {
        type: status.ChangeEventType.REWRITE,
        rewrittenError: 'foo',
      },
      {
        type: status.ChangeEventType.REWRITE,
        rewrittenError: 'bar',
      },
      {
        type: status.ChangeEventType.REWRITE,
        rewrittenError: 'baz',
      },
    ]);
  });
});

describe('rewriteIfError', () => {
  it('Passes through non-error statuses.', () => {
    const okStatus = status.fromValue('foo');
    expect(status.rewriteIfError(okStatus, () => 'bar')).toBe(okStatus);
  });

  it('Rewrites error statuses.', () => {
    const originalError = status.fromError('foo');
    const rewrittenError = status.rewriteIfError(originalError, () => 'bar');
    expect(originalError).toMatchObject({ error: 'foo' });
    expect(rewrittenError).toMatchObject({ error: 'bar' });
  });
});
