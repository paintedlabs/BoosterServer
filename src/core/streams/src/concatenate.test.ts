import * as status from '@core/status';
import * as webStreams from 'web-streams-polyfill';

import * as streams from './index';

describe('concatenate', () => {
  it('returns empty array for no streams.', async () => {
    expect(
      status.throwIfError(await streams.toArray(streams.concatenate([]))),
    ).toStrictEqual([]);
  });

  it('returns empty array for an empty stream.', async () => {
    const stream = new webStreams.ReadableStream({
      start(controller) {
        controller.close();
      },
    });

    expect(
      status.throwIfError(
        await streams.toArray(streams.concatenate([stream])),
      ),
    ).toStrictEqual([]);
  });

  it('collects all values from a non-error state stream.', async () => {
    const stream = webStreams.ReadableStream.from([100, 200, 300]);

    expect(
      status.throwIfError(
        await streams.toArray(streams.concatenate([stream])),
      ),
    ).toStrictEqual([100, 200, 300]);
  });

  it('collects all values from two non-error state streams.', async () => {
    const firstStream = webStreams.ReadableStream.from([100, 200, 300]);
    const secondStream = webStreams.ReadableStream.from([400, 500, 600]);

    expect(
      status.throwIfError(
        await streams.toArray(
          streams.concatenate([firstStream, secondStream]),
        ),
      ),
    ).toStrictEqual([100, 200, 300, 400, 500, 600]);
  });

  it('drains the streams in order.', async () => {
    let firstController!: webStreams.ReadableStreamDefaultController<number>;
    const firstStream = new webStreams.ReadableStream<number>({
      start(controller) {
        firstController = controller;
      },
    });

    let secondController!: webStreams.ReadableStreamDefaultController<number>;
    const secondStream = new webStreams.ReadableStream<number>({
      start(controller) {
        secondController = controller;
      },
    });

    secondController.enqueue(400);
    firstController.enqueue(100);
    secondController.enqueue(500);
    firstController.enqueue(200);
    secondController.enqueue(600);
    firstController.enqueue(300);
    secondController.close();
    firstController.close();

    expect(
      status.throwIfError(
        await streams.toArray(
          streams.concatenate([firstStream, secondStream]),
        ),
      ),
    ).toStrictEqual([100, 200, 300, 400, 500, 600]);
  });

  it('returns an error when a stream errors.', async () => {
    const firstStream = webStreams.ReadableStream.from([100, 200]);
    const secondStream = new webStreams.ReadableStream({
      start(controller) {
        controller.enqueue(300);
        controller.error(status.fromError('Expected error.'));
      },
    });

    expect(
      await streams.toArray(streams.concatenate([firstStream, secondStream])),
    ).toMatchObject({
      error: 'Expected error.',
    });
  });

  it('does not buffer data in the concat stream.', async () => {
    const pull = jest.fn();
    const upstream = new webStreams.ReadableStream(
      { pull },
      new webStreams.CountQueuingStrategy({ highWaterMark: 0 }),
    );

    const merged = streams.concatenate([upstream]);
    const mergedReader = merged.getReader();

    expect(pull).toHaveBeenCalledTimes(0);

    pull.mockImplementationOnce((controller) => {
      controller.enqueue(100);
    });
    await mergedReader.read();
    expect(pull).toHaveBeenCalledTimes(1);

    pull.mockImplementationOnce((controller) => {
      controller.close();
    });
    await mergedReader.read();
    expect(pull).toHaveBeenCalledTimes(2);
  });
});
