import * as webStreams from 'web-streams-polyfill';

export type ReadableStreamTriggers = {
  // Called when the stream is explicitly canceled by the consumer.
  onCancel?: () => void;

  // Called when the stream closes successfully (natural termination).
  onClose?: () => void;

  // Called when the stream terminates due to an error.
  onError?: (error: unknown) => void;

  // Called when the stream requests more data from the underlying source.
  onPull?: () => void;
};

/**
 * Wraps a ReadableStream to observe lifecycle events.
 *
 * This function creates a transparent wrapper around an existing
 * ReadableStream, allowing observation of key stream events without modifying
 * the original stream's behavior.
 *
 * Note that the provided `stream` will be locked and become unreadable. Clients
 * must use the returned `ReadableStream` to access data.
 *
 * @param stream - The source ReadableStream to observe.
 * @param triggers - Lifecycle event callbacks.
 *
 * @return A new ReadableStream that mirrors the source stream with the
 *   additional lifecycle callbacks.
 */
export const observeReadableStream = <T>(
  stream: webStreams.ReadableStream<T>,
  triggers: ReadableStreamTriggers,
): webStreams.ReadableStream<T> => {
  const reader = stream.getReader();

  return new webStreams.ReadableStream<T>(
    {
      async pull(controller) {
        if (triggers.onPull != null) {
          triggers.onPull();
        }

        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            reader.releaseLock();
            if (triggers.onClose != null) {
              triggers.onClose();
            }
            return;
          }

          controller.enqueue(value);
        } catch (error) {
          controller.error(error);
          reader.releaseLock();
          if (triggers.onError != null) {
            triggers.onError(error);
          }
        }
      },

      async cancel(reason) {
        await reader.cancel(reason);
        reader.releaseLock();
        if (triggers.onCancel != null) {
          triggers.onCancel();
        }
      },
    },

    // It's important when wrapping the original stream that we don't
    // inadvertently buffer its contents into the intermediate ReadableStream.
    // We want the intermediate ReadableStream to act transparently.
    new webStreams.CountQueuingStrategy({ highWaterMark: 0 }),
  );
};
