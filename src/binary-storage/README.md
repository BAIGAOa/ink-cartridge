# Binary Storage System

ink-kit provides a **sequential binary storage system** for ordered data streams. Values are written in FIFO order, each prefixed by a 1-byte type tag for validation. This is ideal for game replays, sensor logs, chat streams, and any data where **order matters and keys are unnecessary**.

Complementary to the key-value [Persistence System](../storage/README.md) — use key-value for configuration maps, use binary for sequential streams.

---

## Quick Start

```ts
import { createBinaryStorage } from '@baigao_h/ink-kit';

const bin = createBinaryStorage({ file: 'replay.bin' });

// Write values sequentially
await bin.write.num(Date.now());
await bin.write.str('attack');
await bin.write.num(120);
await bin.write.b(true);

// Read them back in the same order
bin.resetRead();
const ts      = await bin.read.num();   // timestamp
const action  = await bin.read.str();   // 'attack'
const damage  = await bin.read.num();   // 120
const crit    = await bin.read.b();     // true
```

---

## Concepts

### Sequential Model vs Key-Value Model

| | Binary Storage (`createBinaryStorage`) | JSON Storage (`createStorage`) |
|---|---|---|
| Access pattern | FIFO stream, positional cursors | Key-based lookup |
| Keys | None — values identified by position | Explicit string keys |
| Type safety | Per-value type tag (1 byte overhead) | Runtime `typeof` check per key |
| Default values | None — reads are strict | Auto-repair with defaults |
| File format | Binary (`[tag][payload]...`) | JSON (flat object) |
| Best for | Logs, replays, time series | Config, preferences, save files |

### How the Binary Format Works

Each value on disk is self-describing:

```
[1 byte: TypeTag] [payload bytes]

Number:  [0x01] [8 bytes float64 LE]
String:  [0x02] [4 bytes uint32 LE length] [UTF-8 bytes]
Boolean: [0x03] [1 byte: 0x00 = false, 0x01 = true]
Object:  [0x04] [4 bytes uint32 LE length] [JSON UTF-8 bytes]
Array:   [0x05] [4 bytes uint32 LE length] [JSON UTF-8 bytes]
Null:    [0x06]
```

The 1-byte type tag is the foundation of the system:

- **Validation**: `read.num()` on a string position throws immediately with a clear error message including the exact byte offset.
- **Auto-detection**: `read.any()` reads the tag and dispatches to the correct payload reader — you can read mixed-type streams without knowing the next type in advance.
- **Corruption detection**: An unknown tag byte (e.g. `0xFF`) means the file is damaged or was written by a newer format version.

### Architecture: In-Memory Buffer

The entire file is loaded into a single `Buffer` on construction. Two independent cursors track positions:

```
File on disk                       In-memory Buffer
┌────────────────────┐             ┌──────────────────────┐
│ 0x01 3FF00000...   │ ──load──→   │ 0x01 3FF00000...    │
│ 0x02 0005 hello    │             │ 0x02 0005 hello     │
│ 0x03 01            │             │ 0x03 01             │
└────────────────────┘             │ [pre-allocated...]   │
                                   └──────────────────────┘
                                          ↑           ↑
                                      readPos     writePos
                                   (=3 byte)   (=total valid)
```

- **`readPos`** — next byte to read. Starts at 0. Advanced each time a value is consumed.
- **`writePos`** — next byte to write (also equals total valid data size). Advanced each time a value is appended.

Because both cursors point into the same buffer, you can write values and immediately replay them from memory — no disk round-trip.

### Write Path

```
write.num(42)
  │
  ├─ enqueue(task)          → serialise via promise chain
  ├─ growBuf(9)             → ensure buffer capacity (amortised O(1))
  ├─ writeUInt8(0x01, pos)  → type tag
  ├─ writeDoubleLE(42, pos) → payload
  ├─ writePos += 9          → advance cursor
  └─ flush()                → atomic disk write (if flush: true)
```

### Read Path

```
read.num()
  │
  ├─ readTag()              → peek byte at readPos
  │   └─ readPos >= writePos? → throw "end of stream"
  ├─ tag !== 0x01?           → throw "type mismatch at byte N"
  ├─ readPos += 1            → skip past tag
  ├─ readDoubleLE(readPos)   → decode float64
  ├─ readPos += 8            → advance past payload
  └─ return 42
```

### Concurrency Model

Writes are serialised through an internal promise chain:

```ts
bin.write.num(1);  // ↖
bin.write.num(2);  //  ↖  chained in order
bin.write.num(3);  //   ↙
```

Even if one write task rejects (e.g. disk full), subsequent writes continue — the chain uses `.then(task, task)` so it never breaks.

Reads do **not** go through the queue — they run synchronously on the in-memory buffer (wrapped in `async` for API consistency only).

### Atomic Writes

Every flush uses the **write-to-temp-then-rename** pattern:

1. Serialise the buffer (only `writePos` bytes) to `file.bin.tmp`.
2. `fs.renameSync('file.bin.tmp', 'file.bin')`.

On POSIX systems `rename` is atomic — the on-disk file is always either the complete old version or the complete new version. A crash mid-write leaves the original file intact; the `.tmp` file may linger but never corrupts the real file.

### Buffer Growth Strategy

Writing 10,000 small values doesn't mean 10,000 buffer allocations. The internal buffer uses amortised growth — when it runs out of space, it doubles in size with a 4 KiB minimum increment. This means ~20 allocations for 10,000 writes instead of 10,000 — a classic dynamic-array approach.

---

## API Reference

### createBinaryStorage

```ts
function createBinaryStorage(options?: BinaryStorageOptions): BinaryStorageAPI;
```

Factory function that creates a new binary storage station.

**BinaryStorageOptions**

| Property | Type    | Default         | Description                                      |
| -------- | ------- | --------------- | ------------------------------------------------ |
| dir      | string  | `'./data'`      | Directory for the binary file                    |
| file     | string  | `'storage.bin'` | File name                                        |
| flush    | boolean | `true`          | Persist each write immediately; `false` = batch   |

---

### bin.write

```ts
bin.write.num(value: number): Promise<void>;
bin.write.str(value: string): Promise<void>;
bin.write.b(value: boolean): Promise<void>;
bin.write.obj<T extends object>(value: T): Promise<void>;
bin.write.arr<T>(value: T[]): Promise<void>;
bin.write.any(value: unknown): Promise<void>;
bin.write.null(): Promise<void>;
bin.write.flush(): Promise<void>;
```

Append a value to the end of the stream. Writes are serialised and atomic.

- `num` — IEEE 754 float64 LE (8 bytes). Supports `Infinity`, `-Infinity`, `NaN`.
- `str` — 4-byte length prefix + UTF-8 bytes. Handles emoji, CJK, and empty strings.
- `b` — Single byte: `0x00` or `0x01`.
- `obj` / `arr` — JSON‑serialised and stored with distinct type tags.
- `any` — Auto-detects the type via `typeof` + `Array.isArray`.
- `null` — Just the tag byte, no payload.
- `flush` — Force-persist regardless of the `flush` option.

```ts
await bin.write.num(42);                      // [01 0000000000004540]
await bin.write.str('hi');                    // [02 02000000 6869]
await bin.write.b(false);                     // [03 00]
await bin.write.obj({ x: 1 });               // [04 07000000 7b2278223a317d]
await bin.write.any([1, 2]);                  // [05 ...]  auto-detected as Array
```

### bin.read

```ts
bin.read.num(): Promise<number>;
bin.read.str(): Promise<string>;
bin.read.b(): Promise<boolean>;
bin.read.obj<T extends object>(): Promise<T>;
bin.read.arr<T>(): Promise<T[]>;
bin.read.any(): Promise<unknown>;
```

Consume the next value from the stream. Each call advances the read cursor.

**Error cases:**

- **Type mismatch** — the tag byte doesn't match the expected type.
  Throws with the byte position and human-readable type names.

  ```
  BinaryStorage: type mismatch at byte 9. Expected number, got string.
  ```

- **End of stream** — no more values to read (the read cursor has caught up to the write cursor).

  ```
  BinaryStorage: end of stream at byte 18 — no more values to read.
  ```

- **Corrupt file** — the tag byte is not a recognised value (0x01–0x06).

  ```
  BinaryStorage: unknown type tag 0xff at byte 0. File may be corrupt.
  ```

### Position Management

```ts
bin.tellRead(): number;             // current read-cursor byte offset
bin.tellWrite(): number;            // current write-cursor byte offset (= total data)
bin.seekRead(pos: number): void;    // jump read cursor to absolute byte offset
bin.seekWrite(pos: number): Promise<void>; // truncate and jump write cursor
bin.resetRead(): void;              // seekRead(0)
bin.truncate(): Promise<void>;      // seekWrite(tellRead())
```

**Reading a stream to completion:**

```ts
bin.resetRead();
while (bin.tellRead() < bin.tellWrite()) {
  const value = await bin.read.any();
  console.log(value);
}
```

**Bookmarking positions:**

```ts
await bin.write.str('chapter-1');
await bin.write.num(100);
const chapter2 = bin.tellWrite();   // bookmark
await bin.write.str('chapter-2');
await bin.write.num(200);

bin.resetRead();
await bin.read.str();               // 'chapter-1'
await bin.read.num();               // 100
bin.seekRead(chapter2);             // jump to chapter 2
await bin.read.str();               // 'chapter-2'
```

**Undo: roll back recent writes:**

```ts
await bin.write.num(1);
const undoPoint = bin.tellWrite();
await bin.write.num(2);
await bin.write.num(3);

// Undo the last two writes
await bin.seekWrite(undoPoint);

bin.resetRead();
await bin.read.num(); // 1
await bin.read.num(); // throws: end of stream
```

---

## Comparison with JSON Storage

| Feature | Binary Storage | JSON Storage |
|---|---|---|
| **File format** | `[tag][payload]...` binary | `{ "key": value }` JSON |
| **Access** | Sequential (FIFO) | Random (key lookup) |
| **Keys** | None | Required |
| **Defaults** | N/A (reads are strict) | Yes (auto-repair) |
| **Type check** | 1-byte tag per value | `typeof` per key |
| **Seek/truncate** | Yes (byte-level) | No |
| **Human-readable** | No | Yes (2-space JSON) |
| **Space for 1000 floats** | 9000 bytes | ~20 KB |
| **Best for** | Replays, logs, sensors | Config, preferences |

---

## Common Patterns

### Game Replay

```ts
interface Frame {
  tick: number;
  action: string;
  x: number;
  y: number;
  hit: boolean;
}

const rec = createBinaryStorage({ file: 'replay.bin' });

// Recording
async function recordFrame(f: Frame) {
  await rec.write.num(f.tick);
  await rec.write.str(f.action);
  await rec.write.num(f.x);
  await rec.write.num(f.y);
  await rec.write.b(f.hit);
}

// Playback
async function playFrames(): Promise<Frame[]> {
  const result: Frame[] = [];
  rec.resetRead();
  while (rec.tellRead() < rec.tellWrite()) {
    result.push({
      tick:   await rec.read.num(),
      action: await rec.read.str(),
      x:      await rec.read.num(),
      y:      await rec.read.num(),
      hit:    await rec.read.b(),
    });
  }
  return result;
}
```

### Sensor Data Logger (Batch Mode)

```ts
const logger = createBinaryStorage({ file: 'sensor.bin', flush: false });

// Log 10,000 readings without touching disk
for (let i = 0; i < 10_000; i++) {
  await logger.write.num(readSensor());
}

// Persist all at once
await logger.write.flush();
```

### Append-Only Log

```ts
async function appendMsg(sender: string, text: string) {
  const log = createBinaryStorage({ dir: './logs', file: 'chat.bin' });
  await log.write.obj({ sender, text, ts: Date.now() });
}

async function readAllMsgs(): Promise<Array<{sender: string; text: string; ts: number}>> {
  const log = createBinaryStorage({ dir: './logs', file: 'chat.bin' });
  const msgs: Array<{sender: string; text: string; ts: number}> = [];
  log.resetRead();
  while (log.tellRead() < log.tellWrite()) {
    msgs.push(await log.read.obj());
  }
  return msgs;
}
```

### Mixed-Type Stream with read.any

```ts
const stream = createBinaryStorage({ file: 'events.bin' });

await stream.write.any(42);
await stream.write.any('hello');
await stream.write.any(true);
await stream.write.any({ type: 'spawn', id: 7 });
await stream.write.any(null);

stream.resetRead();
while (stream.tellRead() < stream.tellWrite()) {
  const val = await stream.read.any();
  // val is number, string, boolean, object, or null — in order
}
```

### Rollback / Undo System

```ts
const db = createBinaryStorage({ file: 'journal.bin' });

// Record some operations
await db.write.str('insert:Alice');
await db.write.str('insert:Bob');
const checkpoint = db.tellWrite();  // ← safe point
await db.write.str('delete:Alice');
await db.write.str('update:Bob');

// Oops — roll back to checkpoint
await db.seekWrite(checkpoint);

// Only the first two operations remain
db.resetRead();
await db.read.str(); // 'insert:Alice'
await db.read.str(); // 'insert:Bob'
// end of stream
```

---

## Performance Characteristics

| Operation | Complexity | Notes |
|---|---|---|
| `write.*()` | Amortised O(1) | Buffer growth O(n) but infrequent |
| `read.*()` | O(1) | Direct buffer offset access |
| `flush()` | O(n) | Writes entire buffer to disk |
| `seekRead()` | O(1) | Just updates a number |
| `seekWrite()` | O(n) | May copy buffer if truncating |
| `resetRead()` | O(1) | `seekRead(0)` |

For small values (numbers, booleans), disk space is roughly `9 bytes/value` (1 tag + 8 payload). For strings/objects/arrays, it's `5 + UTF8_byte_length` bytes.

---

## Independence

This module has **zero dependencies on React, Ink, or any other part of ink-kit**. It uses only Node.js built-in modules (`fs`, `path`, `Buffer`). You can import and use it in plain `.ts` files without any React context.
