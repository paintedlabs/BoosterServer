import * as status from '@core/status';
import * as webStreams from 'web-streams-polyfill';

import * as streams from './index';

describe('toArray', () => {
  it('returns empty array for an empty stream.', async () => {
    const stream = webStreams.ReadableStream.from([]);

    expect(status.throwIfError(await streams.toArray(stream))).toStrictEqual(
      [],
    );
  });

  it('collects all values from a non-error state stream.', async () => {
    const stream = webStreams.ReadableStream.from([100, 200, 300]);

    expect(status.throwIfError(await streams.toArray(stream))).toStrictEqual([
      100, 200, 300,
    ]);
  });

  it('returns an error when the stream errors.', async () => {
    const stream = new webStreams.ReadableStream({
      start(controller) {
        controller.enqueue(100);
        controller.enqueue(200);
        controller.error(status.fromError('Expected error.'));
      },
    });

    expect(await streams.toArray(stream)).toMatchObject({
      error: 'Expected error.',
    });
  });
});
