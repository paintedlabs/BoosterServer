import * as status from '@core/status';
import * as webStreams from 'web-streams-polyfill';

import * as streams from './index';

describe('filter', () => {
  it('only retains selected values.', async () => {
    const stream = webStreams.ReadableStream.from([
      100, 200, 300, 400, 500, 600,
    ]);

    expect(
      status.throwIfError(
        await streams.toArray(
          streams.filter(stream, (value) => value % 200 === 0),
        ),
      ),
    ).toStrictEqual([200, 400, 600]);
  });
});
