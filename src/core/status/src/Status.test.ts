import * as status from './index';

describe('graftValue', () => {
  test('it successfully grafts if the status is OK.', () => {
    const okStatus: status.Status = status.okStatus();

    expect(status.graftValue(okStatus, 100)).toStrictEqual(
      status.fromValue(100),
    );
  });

  test('it copies the error for a non-OK status.', () => {
    const errorStatus: status.Status = status.fromError('Error');

    expect(status.graftValue(errorStatus, 100)).toMatchObject({
      error: 'Error',
    });
  });
});
