# createStreamingReader

Stream values from a binary file without loading it entirely into memory. Supports async iteration and batched reads with backpressure.

## Signature

```ts
function createStreamingReader(
  filePath: string,
  options?: StreamingReaderOptions
): StreamingReaderAPI
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxQueueSize` | `number` | `1000` | Pause the read stream when the parsed-value queue reaches this size. |
| `highWaterMark` | `number` | `65536` | ReadStream buffer size (64 KiB). |

## Returns

`StreamingReaderAPI`:

| Method | Description |
|--------|-------------|
| `readBatch(count)` | Return up to `count` decoded values. Empty array at end-of-stream. |
| `destroy()` | Stop the stream. Idempotent. |
| `[Symbol.asyncIterator]()` | `for await (const value of reader)` |

## Errors

Throws `StreamCorruptError` on corrupt data, with the byte offset:

```ts
class StreamCorruptError extends Error {
  name: 'StreamCorruptError';
  offset: number;
}
```

## Best Practice

```ts
const reader = createStreamingReader('./data/events.bin');

// Batch mode
const batch = await reader.readBatch(100);
for (const value of batch) {
  process(value);
}

// Or async iteration
for await (const value of reader) {
  process(value);
}
```
