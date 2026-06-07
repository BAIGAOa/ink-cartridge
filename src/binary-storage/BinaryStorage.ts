import * as fs from 'node:fs';
import * as path from 'node:path';
import type { BinaryStorageOptions, BinaryStorageAPI } from './types.js';
import { TypeTag, TAG_NAMES } from './types.js';

/**
 * Size constants for the binary encoding format.
 *
 * Every value on disk has this layout:
 *
 * ```
 * [1 byte: TypeTag] [N bytes: payload]
 * ```
 *
 * The payload size depends on the type:
 * - Number:  8 bytes (IEEE 754 float64, little-endian)
 * - Boolean: 1 byte  (0x00 or 0x01)
 * - String:  4 bytes (uint32 LE length) + UTF-8 content
 * - Object:  same as String (JSON-serialised)
 * - Array:   same as String (JSON-serialised)
 * - Null:    0 bytes (just the tag)
 */
const TAG_SIZE  = 1;
const NUM_SIZE  = 8;
const BOOL_SIZE = 1;
const LEN_SIZE  = 4;

/**
 * Default allocation increment for the internal Buffer.
 *
 * When the buffer needs to grow, we allocate at least 4 KiB
 * extra to amortise the cost of `Buffer.alloc()` + `copy()`
 * across many small writes. A single `write.num()` call needs
 * only 9 bytes, but allocating 9 bytes at a time would be slow.
 */
const GROW_STEP = 4096;

/**
 * Sequential binary key-value store backed by a single file.
 *
 * ## Architecture
 *
 * The entire file is loaded into a single in-memory `Buffer` on
 * construction (lazy — only if the file already exists). Two
 * cursors track the current position:
 *
 * - `readPos`  — where the next `read.*()` will start reading.
 *   Starts at 0. Advanced each time a value is consumed.
 *
 * - `writePos` — where the next `write.*()` will append data.
 *   Starts at the file size (or 0 for a new file). Advanced
 *   each time a value is written.
 *
 * Because both cursors point into the same Buffer, you can write
 * values, then immediately read them back by resetting the read
 * cursor — no disk round-trip needed.
 *
 * ## Write path
 *
 * 1. `write.num(v)` calls `enqueue(() => appendNum(v))`.
 * 2. `enqueue` chains the task onto the internal `pending` promise
 *    so writes are strictly ordered.
 * 3. `appendNum` calls `growBuf()` to ensure capacity, writes
 *    `[TypeTag.Number][8-byte float64 LE]` at `writePos`, then
 *    advances `writePos`.
 * 4. If `flush: true` (default), `forceFlush()` writes the buffer
 *    to disk atomically (temp file → rename).
 *
 * ## Read path
 *
 * 1. `read.num()` calls `readTyped(TypeTag.Number, ...)`.
 * 2. `readTyped` calls `readTag()` which checks `readPos < writePos`
 *    (end-of-stream guard) and returns the byte at `readPos`.
 * 3. If the tag matches `TypeTag.Number`, `readPos` advances past
 *    the tag and the payload reader (`readNumPayload`) is invoked.
 * 4. `readNumPayload` reads 8 bytes at `readPos` as float64 LE,
 *    advances `readPos`, and returns the number.
 *
 * ## Concurrency model
 *
 * Writes are serialised through a promise chain (`this.pending`).
 * The chain uses `.then(task, task)` — the second argument means
 * that even if one write task rejects, subsequent writes still run.
 * Reads do NOT go through the queue because they are synchronous
 * operations on the in-memory buffer (the `async` wrapper is for
 * API consistency only).
 *
 * ## Atomicity guarantee
 *
 * Flush uses the same temp-file-then-rename pattern as the JSON
 * {@link Storage}: write to `file.bin.tmp`, then `fs.renameSync`.
 * On POSIX systems, `rename` is atomic — the on-disk file is
 * always either the complete old version or the complete new
 * version. A crash mid-write leaves the original file intact.
 *
 * ## Buffer growth strategy
 *
 * {@link growBuf} doubles the buffer capacity when it runs out
 * of space, with a minimum increment of {@link GROW_STEP} (4 KiB).
 * This means writing 10,000 small values allocates ~20 times
 * instead of 10,000 times — a classic amortised-O(1) approach.
 */
export class BinaryStorage implements BinaryStorageAPI {
  /** Resolved configuration with defaults applied. */
  private options: Required<BinaryStorageOptions>;
  /** Absolute path to the backing file. */
  private filePath: string;
  /**
   * In-memory copy of the file. Growable — always
   * `buffer.length >= writePos`. Only the first `writePos`
   * bytes are meaningful; the rest is pre-allocated capacity.
   */
  private buffer: Buffer;
  /** Next byte to read from. Always `0 <= readPos <= writePos`. */
  private readPos: number = 0;
  /** Next byte to write to. Equal to total valid data size. */
  private writePos: number;
  /**
   * Promise chain for serialising writes. Each write task
   * is attached via `.then(task, task)` so the chain never
   * breaks even if a task rejects.
   */
  private pending: Promise<void> = Promise.resolve();

  /**
   * @param options  Optional configuration. Instances should be
   *                 created via {@link createBinaryStorage}.
   */
  constructor(options?: BinaryStorageOptions) {
    this.options = {
      dir: options?.dir ?? './data',
      file: options?.file ?? 'storage.bin',
      flush: options?.flush ?? true,
    };
    this.filePath = path.resolve(this.options.dir, this.options.file);
    this.ensureDir();

    // Load existing file into memory, or start with an empty buffer.
    this.buffer = this.loadFile();
    this.writePos = this.buffer.length;
  }

  /**
   * Typed write methods.
   *
   * Each method enqueues the write task so that concurrent
   * callers never interleave. The task:
   * 1. Ensures buffer capacity via `growBuf`.
   * 2. Writes the type tag + payload at `writePos`.
   * 3. Advances `writePos`.
   * 4. Flushes if `options.flush` is true.
   */
  write = {
    num:  (value: number)           => this.enqueue(() => this.appendNum(value)),
    str:  (value: string)           => this.enqueue(() => this.appendStr(value)),
    b:    (value: boolean)          => this.enqueue(() => this.appendBool(value)),
    obj:  <T extends object>(v: T)  => this.enqueue(() => this.appendObj(v)),
    arr:  <T>(v: T[])               => this.enqueue(() => this.appendArr(v)),
    any:  (value: unknown)          => this.enqueue(() => this.appendAny(value)),
    null: ()                        => this.enqueue(() => this.appendNull()),
    /** Force-persist regardless of the `flush` option. */
    flush: ()                       => this.enqueue(async () => { await this.forceFlush(); }),
  };

  /**
   * Typed read methods.
   *
   * Each method delegates to `readTyped()` which validates the
   * type tag, then calls the type-specific payload reader.
   * Wrapped in `async` so that errors thrown synchronously
   * (e.g. type mismatch) become Promise rejections.
   */
  read = {
    num:  async ()                      => this.readTyped(TypeTag.Number,  () => this.readNumPayload()),
    str:  async ()                      => this.readTyped(TypeTag.String,  () => this.readStrPayload()),
    b:    async ()                      => this.readTyped(TypeTag.Boolean, () => this.readBoolPayload()),
    obj:  async <T extends object>()    => this.readTyped(TypeTag.Object,  () => this.readJSONPayload<T>()),
    arr:  async <T>()                   => this.readTyped(TypeTag.Array,   () => this.readJSONPayload<T[]>()),
    any:  async ()                      => this.readAnyPayload(),
  };

  tellRead(): number { return this.readPos; }
  tellWrite(): number { return this.writePos; }

  seekRead(pos: number): void {
    if (pos < 0 || pos > this.writePos) {
      throw new Error(
        `[Ink-Router-Kit] BinaryStorage: seekRead(${pos}) out of range ` +
        `(0..${this.writePos}).`
      );
    }
    this.readPos = pos;
  }

  /**
   * Truncate the stream at `pos` and persist.
   *
   * Because this mutates the buffer, it goes through the write
   * queue to avoid racing with in-flight writes. If the read
   * cursor would end up past the new write position, it is
   * clamped back.
   */
  async seekWrite(pos: number): Promise<void> {
    if (pos < 0) {
      throw new Error(
        `[Ink-Router-Kit] BinaryStorage: seekWrite(${pos}) must be >= 0.`
      );
    }
    await this.enqueue(async () => {
      // If the truncation point is within the current buffer,
      // slice away everything beyond it. Using Buffer.from()
      // creates an independent copy so the old buffer can be GC'd.
      if (pos < this.buffer.length) {
        this.buffer = Buffer.from(this.buffer.subarray(0, pos));
      }
      this.writePos = pos;
      if (this.readPos > this.writePos) {
        this.readPos = this.writePos;
      }
      await this.flush();
    });
  }

  resetRead(): void { this.seekRead(0); }

  /** Convenience: discard everything after the read cursor. */
  async truncate(): Promise<void> {
    await this.seekWrite(this.readPos);
  }

  // ═══════════════════════════════════════════════════════════
  //  Internal helpers — not part of the public API
  // ═══════════════════════════════════════════════════════════

  private ensureDir(): void {
    fs.mkdirSync(this.options.dir, { recursive: true });
  }

  /**
   * Read the file into a Buffer. Returns an empty buffer if the
   * file does not exist (first use) or can't be read.
   */
  private loadFile(): Buffer {
    try {
      return fs.readFileSync(this.filePath);
    } catch {
      return Buffer.alloc(0);
    }
  }

  /**
   * Serialise access so concurrent callers never interleave.
   *
   * Each task is chained onto `this.pending` using
   * `.then(task, task)`. The second `task` argument is critical:
   * it means that if a previous task rejects, the next task
   * still executes. Without it, a single failed write would
   * permanently break the chain and all subsequent writes
   * would hang.
   */
  private enqueue(task: () => Promise<void>): Promise<void> {
    this.pending = this.pending.then(task, task);
    return this.pending;
  }

  /**
   * Conditional flush — only persists if `options.flush` is true.
   *
   * Called automatically after every write when `flush: true`.
   * When `flush: false`, writes are buffered in memory until
   * {@link forceFlush} is called (via `write.flush()`).
   */
  private async flush(): Promise<void> {
    if (!this.options.flush) return;
    await this.forceFlush();
  }

  /**
   * Unconditional flush — always writes to disk.
   *
   * Only the first `writePos` bytes are written; the rest of the
   * buffer is pre-allocated capacity. Uses atomic rename to
   * prevent corruption from partial writes or crashes.
   */
  private async forceFlush(): Promise<void> {
    const tmpPath = this.filePath + '.tmp';
    fs.writeFileSync(tmpPath, this.buffer.subarray(0, this.writePos));
    fs.renameSync(tmpPath, this.filePath);
  }

  // ── write payload helpers ──────────────────────────────────

  /**
   * Ensure the internal Buffer has at least `needed` free bytes
   * after `writePos`.
   *
   * Growth strategy: allocate `max(needed, GROW_STEP)` extra bytes,
   * copy the old buffer into the new one. This is amortised O(1)
   * per byte written — the classic dynamic-array approach.
   */
  private growBuf(needed: number): void {
    if (this.writePos + needed <= this.buffer.length) return;
    const extra = Math.max(needed, GROW_STEP);
    const grown = Buffer.alloc(this.buffer.length + extra);
    this.buffer.copy(grown);
    this.buffer = grown;
  }

  /**
   * Encode a number: `[0x01][8 bytes float64 LE]`.
   *
   * Uses `writeDoubleLE` which writes IEEE 754 binary64 format.
   * This preserves all JS numbers faithfully, including special
   * values like `Infinity`, `-Infinity`, and `NaN`.
   */
  private async appendNum(value: number): Promise<void> {
    this.growBuf(TAG_SIZE + NUM_SIZE);
    this.buffer.writeUInt8(TypeTag.Number, this.writePos);
    this.buffer.writeDoubleLE(value, this.writePos + TAG_SIZE);
    this.writePos += TAG_SIZE + NUM_SIZE;
    await this.flush();
  }

  /**
   * Encode a string: `[0x02][4 bytes uint32 LE length][UTF-8 bytes]`.
   *
   * The length is the byte count of the UTF-8 encoding, not the
   * character count. This ensures multi-byte characters (emoji,
   * CJK) are handled correctly.
   */
  private async appendStr(value: string): Promise<void> {
    const encoded = Buffer.from(value, 'utf-8');
    this.growBuf(TAG_SIZE + LEN_SIZE + encoded.length);
    let pos = this.writePos;
    this.buffer.writeUInt8(TypeTag.String, pos);   pos += TAG_SIZE;
    this.buffer.writeUInt32LE(encoded.length, pos); pos += LEN_SIZE;
    encoded.copy(this.buffer, pos);
    this.writePos = pos + encoded.length;
    await this.flush();
  }

  /**
   * Encode a boolean: `[0x03][1 byte: 0x00 or 0x01]`.
   */
  private async appendBool(value: boolean): Promise<void> {
    this.growBuf(TAG_SIZE + BOOL_SIZE);
    this.buffer.writeUInt8(TypeTag.Boolean, this.writePos);
    this.buffer.writeUInt8(value ? 1 : 0, this.writePos + TAG_SIZE);
    this.writePos += TAG_SIZE + BOOL_SIZE;
    await this.flush();
  }

  /**
   * Encode an object as JSON: `[0x04][4 bytes length][JSON UTF-8]`.
   *
   * Objects and arrays use the same wire format (length-prefixed
   * UTF-8 string) but different type tags so that `read.obj()`
   * and `read.arr()` can validate the expected shape.
   */
  private async appendObj(value: object): Promise<void> {
    const json = JSON.stringify(value);
    const encoded = Buffer.from(json, 'utf-8');
    this.growBuf(TAG_SIZE + LEN_SIZE + encoded.length);
    let pos = this.writePos;
    this.buffer.writeUInt8(TypeTag.Object, pos);  pos += TAG_SIZE;
    this.buffer.writeUInt32LE(encoded.length, pos); pos += LEN_SIZE;
    encoded.copy(this.buffer, pos);
    this.writePos = pos + encoded.length;
    await this.flush();
  }

  /**
   * Encode an array as JSON: `[0x05][4 bytes length][JSON UTF-8]`.
   */
  private async appendArr(value: unknown[]): Promise<void> {
    const json = JSON.stringify(value);
    const encoded = Buffer.from(json, 'utf-8');
    this.growBuf(TAG_SIZE + LEN_SIZE + encoded.length);
    let pos = this.writePos;
    this.buffer.writeUInt8(TypeTag.Array, pos);  pos += TAG_SIZE;
    this.buffer.writeUInt32LE(encoded.length, pos); pos += LEN_SIZE;
    encoded.copy(this.buffer, pos);
    this.writePos = pos + encoded.length;
    await this.flush();
  }

  /**
   * Auto-detect the type of `value` and delegate to the
   * appropriate typed append method.
   *
   * Detection order:
   * 1. `typeof` for number/string/boolean → typed tags
   * 2. `null` / `undefined` → TypeTag.Null
   * 3. `Array.isArray` → TypeTag.Array
   * 4. `typeof === 'object'` → TypeTag.Object
   * 5. Fallback → TypeTag.Null (shouldn't happen, but safe)
   */
  private async appendAny(value: unknown): Promise<void> {
    if (typeof value === 'number')       { await this.appendNum(value); }
    else if (typeof value === 'string')   { await this.appendStr(value); }
    else if (typeof value === 'boolean')  { await this.appendBool(value); }
    else if (value === null || value === undefined) { await this.appendNull(); }
    else if (Array.isArray(value))        { await this.appendArr(value); }
    else if (typeof value === 'object')   { await this.appendObj(value as object); }
    else { await this.appendNull(); }
  }

  /**
   * Encode null: `[0x06]` — just the tag, no payload.
   */
  private async appendNull(): Promise<void> {
    this.growBuf(TAG_SIZE);
    this.buffer.writeUInt8(TypeTag.Null, this.writePos);
    this.writePos += TAG_SIZE;
    await this.flush();
  }

  // ── read helpers ───────────────────────────────────────────

  /**
   * Peek at the type tag byte at `readPos`.
   *
   * This is the end-of-stream guard for all typed read methods.
   * It checks against `writePos` (not `buffer.length`) because
   * the buffer may have pre-allocated capacity beyond the valid
   * data region.
   *
   * @returns The tag byte (0x01–0x06).
   * @throws If `readPos >= writePos` (no more values to read).
   */
  private readTag(): number {
    if (this.readPos >= this.writePos) {
      throw new Error(
        `[Ink-Router-Kit] BinaryStorage: end of stream at byte ${this.readPos} — ` +
        `no more values to read.`
      );
    }
    return this.buffer.readUInt8(this.readPos);
  }

  /**
   * Read a uint32 LE length prefix from `readPos` and advance.
   *
   * @returns The length value.
   * @throws If there aren't enough bytes for the length prefix.
   */
  private readUInt32LE(): number {
    if (this.readPos + LEN_SIZE > this.writePos) {
      throw new Error(
        `[Ink-Router-Kit] BinaryStorage: unexpected end of stream at byte ${this.readPos} ` +
        `while reading length prefix.`
      );
    }
    const v = this.buffer.readUInt32LE(this.readPos);
    this.readPos += LEN_SIZE;
    return v;
  }

  /**
   * Core typed-read routine.
   *
   * 1. Peek at the tag byte.
   * 2. If it doesn't match `expected`, throw a descriptive error
   *    with the byte position and human-readable type names.
   * 3. Otherwise advance past the tag and invoke the payload
   *    reader callback.
   *
   * @typeParam T — The return type of the payload reader.
   * @param expected    — The TypeTag we expect to find.
   * @param readPayload — Callback that reads the payload bytes
   *                      and returns the decoded value.
   */
  private readTyped<T>(expected: TypeTag, readPayload: () => T): T {
    const tag = this.readTag();
    if (tag !== expected) {
      const expectedName = TAG_NAMES[expected];
      const actualName = TAG_NAMES[tag as TypeTag] ?? `unknown(0x${tag.toString(16)})`;
      throw new Error(
        `[Ink-Router-Kit] BinaryStorage: type mismatch at byte ${this.readPos}. ` +
        `Expected ${expectedName}, got ${actualName}.`
      );
    }
    this.readPos += TAG_SIZE;
    return readPayload();
  }

  /**
   * Read 8 bytes as a float64 LE number.
   *
   * Uses `readDoubleLE` which decodes IEEE 754 binary64.
   * `Infinity`, `-Infinity`, and `NaN` round-trip correctly.
   */
  private readNumPayload(): number {
    if (this.readPos + NUM_SIZE > this.writePos) {
      throw new Error(
        `[Ink-Router-Kit] BinaryStorage: unexpected end of stream at byte ${this.readPos} ` +
        `while reading number (need ${NUM_SIZE} bytes).`
      );
    }
    const val = this.buffer.readDoubleLE(this.readPos);
    this.readPos += NUM_SIZE;
    return val;
  }

  /**
   * Read a length-prefixed UTF-8 string.
   *
   * 1. Read 4-byte uint32 LE → byte length.
   * 2. Read that many bytes as UTF-8.
   */
  private readStrPayload(): string {
    const len = this.readUInt32LE();
    if (this.readPos + len > this.writePos) {
      throw new Error(
        `[Ink-Router-Kit] BinaryStorage: unexpected end of stream at byte ${this.readPos}. ` +
        `Expected ${len} bytes of string data, only ${this.writePos - this.readPos} available.`
      );
    }
    const val = this.buffer.toString('utf-8', this.readPos, this.readPos + len);
    this.readPos += len;
    return val;
  }

  /**
   * Read a single byte as a boolean.
   *
   * Any non-zero byte is treated as `true`.
   */
  private readBoolPayload(): boolean {
    if (this.readPos + BOOL_SIZE > this.writePos) {
      throw new Error(
        `[Ink-Router-Kit] BinaryStorage: unexpected end of stream at byte ${this.readPos} ` +
        `while reading boolean.`
      );
    }
    const val = this.buffer.readUInt8(this.readPos) !== 0;
    this.readPos += BOOL_SIZE;
    return val;
  }

  /**
   * Read a string payload and parse it as JSON.
   *
   * Shared by `read.obj()` and `read.arr()` — the type tag
   * distinguishes the two, but the on-wire format is identical
   * (JSON string).
   */
  private readJSONPayload<T>(): T {
    const raw = this.readStrPayload();
    return JSON.parse(raw) as T;
  }

  /**
   * Read the next value regardless of type.
   *
   * Reads the tag byte, then dispatches to the appropriate
   * payload reader. This is the universal read method — it
   * accepts any type and returns the decoded value directly.
   *
   * @throws If the tag byte is unknown (file corruption or
   *         newer format version).
   */
  private readAnyPayload(): unknown {
    const tag = this.readTag();
    this.readPos += TAG_SIZE;
    switch (tag) {
      case TypeTag.Number:  return this.readNumPayload();
      case TypeTag.String:  return this.readStrPayload();
      case TypeTag.Boolean: return this.readBoolPayload();
      case TypeTag.Object:  return this.readJSONPayload();
      case TypeTag.Array:   return this.readJSONPayload();
      case TypeTag.Null:    return null;
      default:
        throw new Error(
          `[Ink-Router-Kit] BinaryStorage: unknown type tag 0x${tag.toString(16)} ` +
          `at byte ${this.readPos - TAG_SIZE}. File may be corrupt.`
        );
    }
  }
}
