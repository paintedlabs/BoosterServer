import * as status from '@core/status';
import * as webStreams from 'web-streams-polyfill';

/**
 * Converts a given readable stream into an array.
 *
 * __IMPORTANT NOTE:__ Streams are designed to manage backpressure, which means
 * they control the flow of data so that the data source does not overwhelm the
 * consumer. This helps in efficiently using compute resources. By converting
 * the stream into an array, we lose the ability to manage backpressure because
 * we gather data as fast as it is buffered, not as fast as it is processed.
 * Generally, it's better to use `WritableStream` or `TransformStream` to handle
 * `ReadableStream` data. This function is mostly useful for testing purposes
 * rather than in production.
 *
 * @param stream - The stream to drain into an array.
 *
 * @returns An array containing the streamed data.
 */
export const toArray = async <T>(
  stream: webStreams.ReadableStream<T>,
): Promise<status.StatusOr<Array<T>, unknown>> => {
  const buffer: Array<T> = [];

  const sink = new webStreams.WritableStream<T>({
    write(chunk) {
      buffer.push(chunk);
    },
  });

  try {
    await stream.pipeTo(sink);
    return status.fromValue(buffer);
  } catch (error) {
    if (status.isStatusOr(error) && !status.isOk(error)) {
      return error;
    } else if (error instanceof Error) {
      return status.fromNativeError(error);
    } else {
      return status.fromError(error);
    }
  }
};
