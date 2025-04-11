import * as webStream from 'web-streams-polyfill';

export const filter = <T>(
  stream: webStream.ReadableStream<T>,
  filter: (chunk: T) => boolean,
): webStream.ReadableStream<T> =>
  stream.pipeThrough(createFilterTransform(filter));

export const createFilterTransform = <T>(
  filter: (chunk: T) => boolean,
): webStream.TransformStream<T, T> =>
  new webStream.TransformStream<T, T>({
    transform(chunk, controller) {
      if (filter(chunk)) {
        controller.enqueue(chunk);
      }
    },
  });
