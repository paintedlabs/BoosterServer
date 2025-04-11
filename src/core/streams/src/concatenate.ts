import * as webStreams from 'web-streams-polyfill';

/**
 * Merges an array of readable streams into a single readable stream by reading
 * them in series.
 *
 * @param streams - An array of readable streams.
 *
 * @returns A single stream from all the inputted streams.
 */
export const concatenate = <T>(
  streams: Iterable<webStreams.ReadableStream<T>>,
): webStreams.ReadableStream<T> => {
  const streamsIterator = streams[Symbol.iterator]();

  let currentReader: webStreams.ReadableStreamDefaultReader<T> | null = null;
  return new webStreams.ReadableStream(
    {
      async pull(controller) {
        while (true) {
          // If there's no current reader, try to get the next stream.
          if (currentReader == null) {
            const { value: nextStream, done } = streamsIterator.next();
            if (done) {
              controller.close();
              return;
            }

            currentReader = nextStream.getReader();
          }

          // Read from the current stream.
          const result = await currentReader.read();
          if (!result.done) {
            controller.enqueue(result.value);
            return;
          }

          // When the current stream is exhausted, release its lock.
          currentReader.releaseLock();
          currentReader = null;
        }
      },
    },
    new webStreams.CountQueuingStrategy({ highWaterMark: 0 }),
  );
};
