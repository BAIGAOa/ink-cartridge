# Binary Storage System

ink-cartridge provides **two binary storage modes** for ordered, typed data: an in-memory random-access mode and a streaming mode for large files. Both use the same binary encoding format (1-byte type tag + type-specific payload), so files written by one mode can be read by the other.

---

## Quick Comparison

| Feature | `createBinaryStorage` | `createStreamingReader` |
|---------|----------------------|------------------------|
| Memory | Entire file in Buffer | ~64 KB working set |
| Access | Random (seek/tell/reset) | Sequential only |
| Write | Yes (append + flush) | No (read-only) |
| Best for | Small files, replay buffers, checkpoints | Files > 500 MB, backpressure-sensitive pipelines |

---

## Streaming Reader

### When to use it

- Your binary file exceeds 500 MB and loading it into memory would cause OOM.
- You need to process values one batch at a time with bounded memory.
- You want `for await` iteration over millions of records.
- You need backpressure — the reader adapts to your processing speed.
- You want to interleave reading with other async work without blocking the event loop.

### When NOT to use it

- You need random access / seek to arbitrary positions (use `createBinaryStorage` instead).
- You need to write data (the streaming reader is read-only; use `createBinaryStorage` to write).
- Your file is small enough to fit in memory comfortably.
- You need to replay data multiple times (`createBinaryStorage.resetRead()` is simpler).

### Installation

The streaming reader is part of `ink-cartridge` — no extra dependency.

```ts
import { createStreamingReader } from 'ink-cartridge';
import type { StreamingReaderOptions } from 'ink-cartridge';
```

### How it works

`createStreamingReader(filePath, options?)` opens the file as a Node.js `ReadStream` and incrementally parses the binary values using a **5-state state machine**:

```
NeedTag  ────►  NeedNum   (for numbers)
              ►  NeedBool  (for booleans)
              ►  NeedLen   (for strings/objects/arrays)
              ►  NeedTag   (for null — no payload, immediate)
NeedLen ────►  NeedVar   (after reading 4-byte length prefix)
NeedNum / NeedBool / NeedVar ────►  NeedTag  (value complete, ready for next)
```

Each state waits for enough bytes to arrive before advancing. If a chunk boundary falls in the middle of any field, the state machine **returns** without consuming partial data, and resumes from the exact same position when the next chunk arrives.

The stream starts **paused** and only resumes when a consumer requests data. This ensures the file descriptor never reads ahead of what the application can process.

#### Buffer trimming

As bytes are consumed, the internal buffer accumulates. Once the consumed offset exceeds 64 KB, `advanceToNeedTag()` **discards the front** via `this.buf.subarray(this.offset)` — a zero-copy view shift. The `byteTrimming` counter tracks how many bytes have been discarded, so when a `StreamCorruptError` is thrown, the offset in the error message is computed as `byteTrimming + lastTagOffset`, giving the absolute file position regardless of how much trimming has occurred.

This means the reader's heap usage stays approximately:

```
maxParseChunk + 64 KB + maxQueueSize × averageValueSize
```

— typically under 50 MB for any file size, including multi-gigabyte files.

#### Backpressure

```
Consumer readBatch(N)  ←  Internal Queue (maxQueueSize)  ←  ReadStream (disk)
       │                          │                              │
       └── takes N values ────────┘                              │
                                  └── queue > maxQueueSize ──────► stream.pause()
                                  ◄── queue < maxQueueSize ─────── stream.resume()
```

When the consumer is slow (e.g. processing each value takes time), the queue fills up. At the `maxQueueSize` threshold, the ReadStream is **paused** — no more data is read from disk. When the consumer drains values below the threshold, the stream **resumes**. This prevents memory from growing unboundedly when the producer (disk I/O) is faster than the consumer.

#### Error isolation

The reader uses two separate flags for terminal states:

- **`fatalError`** — set by corrupt data, truncated file, or I/O error. All subsequent calls **throw** the error. The reader is dead — call `destroy()` to release the file descriptor.
- **`destroyed`** — set by user-initiated `destroy()`. Subsequent calls return empty results **silently** (no error). Idempotent and safe.

This distinction matters: a corrupt file must keep throwing so you know data is lost, while a graceful shutdown should not spam errors.

### API Reference

#### `createStreamingReader(filePath, options?)`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `filePath` | `string` | — | Path to the binary file. Relative paths resolve to `process.cwd()`. |
| `options.highWaterMark` | `number` | `65536` (64 KiB) | Chunk size for `fs.createReadStream` (bytes). Smaller values = more I/O calls but lower per-chunk latency. Useful for testing cross-chunk-boundary parsing. |
| `options.maxQueueSize` | `number` | `1000` | Maximum number of parsed values buffered in the internal queue before the ReadStream is paused (backpressure trigger). |

**Throws synchronously** `ENOENT` if the file does not exist. `StreamCorruptError` if the file is corrupt or truncated (thrown asynchronously from `readBatch` / `for await`).

---

#### `reader.readBatch(count: number): Promise<unknown[]>`

Read up to `count` complete values from the file.

- Returns **fewer** than `count` only when the file is exhausted — the last batch may be smaller.
- Returns **`[]`** when there is no more data (end-of-stream).
- **Never** returns partial values. Every element in the array is a fully decoded value.
- If the queue has enough values, returns immediately (synchronously resolved promise).
- If the queue is empty and the stream is still active, waits for more data.
- If a corrupt/truncated file is detected, the promise is **rejected** with `StreamCorruptError`.

```ts
const reader = createStreamingReader('events.bin');
let batch;
while ((batch = await reader.readBatch(1000)).length > 0) {
  for (const event of batch) {
    processEvent(event);
  }
}
console.log('Done — all events processed.');
```

```ts
// Error handling
try {
  const batch = await reader.readBatch(100);
  console.log(batch);
} catch (err) {
  if (err instanceof StreamCorruptError) {
    console.error(`Corrupt at offset ${err.offset}: ${err.message}`);
  }
}
```

---

#### `reader[Symbol.asyncIterator](): AsyncIterator<unknown>`

Iterate over every value one by one using `for await`:

```ts
for await (const value of reader) {
  console.log(value);
}
```

Behind the scenes, each `next()` call creates a `Deferred<IteratorResult>`, pushes it to the `iterWaiters` array, and resumes the stream. When a value is parsed, the waiter is resolved.

You can freely **interleave** `readBatch()` and `for await` — they share the same internal queue and cursor:

```ts
const reader = createStreamingReader('file.bin');

// Read first 5 values in a batch
const firstFive = await reader.readBatch(5);

// Iterate over the rest one by one
for await (const value of reader) {
  console.log(value);
}
```

---

#### `reader.destroy(): void`

Close the underlying file descriptor and release all resources.

- Pending `readBatch()` calls resolve with `[]`.
- The async iterator returns `{ done: true }` immediately.
- Idempotent — calling `destroy()` multiple times is safe.

```ts
const reader = createStreamingReader('huge.bin');

// Start reading
setTimeout(() => {
  reader.destroy(); // Cancel mid-way — no leak
}, 100);
```

### Complete lifecycle example

```ts
import { createBinaryStorage, createStreamingReader } from 'ink-cartridge';

async function demo() {
  // ── Write phase ──
  const writer = createBinaryStorage({ file: 'data.bin', flush: false });
  for (let i = 0; i < 100_000; i++) {
    await writer.write.any({ id: i, value: Math.random(), type: i % 2 });
  }
  await writer.write.flush();

  // ── Stream read phase ──
  const reader = createStreamingReader('data.bin');
  try {
    let total = 0;
    let batch: unknown[];
    while ((batch = await reader.readBatch(500)).length > 0) {
      total += batch.length;
      for (const item of batch) {
        // Process each item...
      }
    }
    console.log(`Read ${total} values.`);
  } catch (err) {
    console.error('Failed while streaming:', err);
  } finally {
    reader.destroy();
  }
}
```

### Error handling

| Condition | Behaviour | Recommended action |
|-----------|-----------|-------------------|
| File does not exist | `createStreamingReader` throws synchronously (`ENOENT`) | Check `filePath`, create it first, or handle the exception before any read call |
| Unknown type tag (corruption) | `readBatch`/`for await` throws `StreamCorruptError` with `offset` | Log the offset for debugging; the file is unrecoverable past that point |
| File truncated mid-value | `StreamCorruptError` 'Incomplete data — file truncated mid-value' | The file was not fully written or was truncated; re-generate if possible |
| Invalid JSON in object/array payload | `StreamCorruptError` with `offset` | File corruption at the JSON-parsing stage |
| Empty file | `readBatch` returns `[]`, `for await` produces no values | Not an error — zero-size is valid |
| File read error (e.g. permission) | Propagates as underlying `fs.ReadStream` error | Check file permissions and disk health |
| Call after `destroy()` | `readBatch` returns `[]`, iterator stops | Graceful no-op; no error thrown |

After any error, the reader enters a **fatal** state — all subsequent calls throw the same error. This guarantees you never read past corrupted data. Call `destroy()` to release the file descriptor.

### Performance considerations

#### Memory

The streaming reader keeps approximately:

- **Internal buffer**: up to `highWaterMark + 64 KB` (the chunk being parsed + unconsumed bytes from previous chunks).
- **Value queue**: up to `maxQueueSize` parsed values. For typical objects (~100 bytes each), that's ~100 KB.

Total: **~200 KB–50 MB** depending on value size and queue configuration.

#### Chunk size tuning (`highWaterMark`)

| Value | Pros | Cons | When to use |
|-------|------|------|-------------|
| 16 KB | Lower per-chunk latency | More I/O syscalls | Slow disks, real-time streaming |
| 64 KB (default) | Good balance for most workloads | — | General use |
| 256 KB | Fewer I/O syscalls | Higher per-chunk latency, more memory | Fast NVMe disks, large values |
| 1 MB | Maximum throughput | 1 MB+ per chunk memory | Batch processing, no latency concerns |

#### Queue size tuning (`maxQueueSize`)

| Value | Pros | Cons | When to use |
|-------|------|------|-------------|
| 100 | Tight memory, aggressive backpressure | Frequent pause/resume cycles | Low-memory environments |
| 1000 (default) | Smooth backpressure | ~100 KB–1 MB queue memory | General use |
| 10000 | Fewer pause/resume cycles | ~1–10 MB queue memory | Fast consumers, large files |
| 100000 | Minimal backpressure overhead | ~10–100 MB queue memory | Batch processing, consumer faster than I/O |

#### I/O pattern

The ReadStream reads sequentially, so the disk head never seeks. On HDDs this gives ~100 MB/s throughput; on SSDs it is usually I/O-bound by the filesystem rather than the media.

---

## Binary Storage (original mode)

For full documentation of the in-memory random-access mode, see the [`BinaryStorage` source](./BinaryStorage.ts).

```ts
import { createBinaryStorage } from 'ink-cartridge';

const bin = createBinaryStorage({ file: 'checkpoint.bin' });
await bin.write.num(Date.now());
await bin.write.str('checkpoint-1');
await bin.write.obj({ x: 100, y: 200 });

bin.resetRead();
const ts = await bin.read.num();
const name = await bin.read.str();
const pos = await bin.read.obj();
```

Key differences from the streaming reader:

| Aspect | `createBinaryStorage` | `createStreamingReader` |
|--------|----------------------|------------------------|
| Initialisation | Creates directory if missing | File must exist (`ENOENT` otherwise) |
| Read cursor | `seekRead(pos)`, `resetRead()`, `tellRead()` | Not available (sequential only) |
| Write cursor | `seekWrite(pos)`, `truncate()`, `tellWrite()` | Not available (read-only) |
| Write methods | `write.num()`, `write.str()`, `write.b()`, etc. | Not available |
| Read methods | Typed: `read.num()`, `read.str()`, `read.b()`, etc. | Untyped: `readBatch(N)` returns `unknown[]` |
| Error on type mismatch | `read.num()` on a string position → throws immediately | Not applicable (all values go through `readAnyPayload`) |
| File creation | Auto-creates on first write | File must exist before calling |
| Concurrency | Writes serialised through a promise chain | Multiple readers on same file are independent (each has its own file descriptor and cursor) |

### When each is better

Use **`createBinaryStorage`** when:
- You need to **write** data (it's the only mode with write support).
- You need **random access** (`seekRead` / `resetRead` / `truncate`).
- You need **typed reads** that validate against the expected type.
- The file is small enough (< ~100 MB) that loading it into memory is fine.
- You want to replay data from the beginning without reopening the file.

Use **`createStreamingReader`** when:
- The file is **large** (> 500 MB) and you can't load it into memory.
- You need **bounded memory** regardless of file size.
- You want **backpressure** — the reader adapts to your processing speed.
- You need `for await` syntax over millions of records.
- You want to read a file that was written by `BinaryStorage` (format compatible).

---

## Binary Format

Both modes use the same wire format, so you can write with `BinaryStorage` and read with `StreamingReader` (or vice versa).

```
[1 byte TypeTag] [payload...]

Number:  [0x01] [8 bytes float64 LE]
String:  [0x02] [4 bytes uint32 LE length] [UTF-8 bytes]
Boolean: [0x03] [1 byte: 0x00=false, 0x01=true]
Object:  [0x04] [4 bytes uint32 LE length] [JSON UTF-8 bytes]
Array:   [0x05] [4 bytes uint32 LE length] [JSON UTF-8 bytes]
Null:    [0x06]           (no payload)
```

### TypeTag values

| Tag | Hex | Type | Payload size | Notes |
|-----|-----|------|-------------|-------|
| Number | `0x01` | IEEE 754 float64 | 8 bytes | Little-endian. Preserves `Infinity`, `NaN`. |
| String | `0x02` | UTF-8 string | 4 + len(varies) | Length prefix is uint32 LE byte count, not char count. |
| Boolean | `0x03` | true/false | 1 byte | `0x00` = false, `0x01` = true. Any non-zero = true. |
| Object | `0x04` | JSON object | 4 + len(varies) | JSON-serialised. Stored as UTF-8 with length prefix. |
| Array | `0x05` | JSON array | 4 + len(varies) | Same wire format as Object, different tag for type discrimination. |
| Null | `0x06` | null | 0 bytes | Just the tag, no payload. |

### Byte-level example

Writing `[42, "hello", null]` produces this byte sequence:

```
Offset  Bytes           Meaning
─────────────────────────────────────────
0       0x01            Tag: Number
1-8     00 00 00 00 00 80 45 40    Float64 LE = 42

9       0x02            Tag: String
10-13   05 00 00 00     Uint32 LE length = 5
14-18   68 65 6c 6c 6f  UTF-8: "hello"

19      0x06            Tag: Null (no payload)
```

Total: 20 bytes for 3 values.
