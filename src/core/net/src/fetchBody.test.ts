import * as status from '@core/status';
import jestFetchMock from 'jest-fetch-mock';

import * as net from './index';

beforeAll(() => {
  jestFetchMock.enableMocks();
});

afterAll(() => {
  jestFetchMock.disableMocks();
});

describe('fetchBody', () => {
  it('returns a failure if fetch throws an exception.', async () => {
    jestFetchMock.mockOnce(async () => {
      throw new Error('some error');
    });

    expect(await net.fetchBody('http://fake.com')).toMatchObject({
      error: {
        type: net.ErrorType.UNKNOWN,
      },
    });
  });

  it('returns a status failure if the response has a non-200 code despite a body.', async () => {
    jestFetchMock.mockOnce(async () => ({
      status: 404,
      body: 'Not Found',
    }));

    expect(await net.fetchBody('http://fake.com')).toMatchObject({
      error: {
        type: net.ErrorType.UNEXPECTED_STATUS,
      },
    });
  });

  it('returns a status failure if the response has a non-200 code and no body.', async () => {
    jestFetchMock.mockOnce(async () => ({
      status: 203,
    }));

    expect(await net.fetchBody('http://fake.com')).toMatchObject({
      error: {
        type: net.ErrorType.UNEXPECTED_STATUS,
      },
    });
  });

  it('returns a failure if the response is missing a body.', async () => {
    jestFetchMock.mockOnce(async () => ({
      status: 200,
      body: undefined,
    }));

    expect(await net.fetchBody('http://fake.com')).toMatchObject({
      error: {
        type: net.ErrorType.NO_CONTENT,
      },
    });
  });

  it('returns an existing body if 200 status.', async () => {
    jestFetchMock.mockOnce(async () => ({
      status: 200,
      body: 'Fake Content',
    }));

    expect(
      status.throwIfError(await net.fetchBody('http://fake.com')),
    ).toEqual('Fake Content');
  });
});
