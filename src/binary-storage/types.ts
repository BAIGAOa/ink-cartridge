/**
 * Configuration for {@link createBinaryStorage}.
 *
 * All properties are optional — defaults make `createBinaryStorage()` work
 * with zero arguments, creating a `./data/storage.bin` file.
 */
export interface BinaryStorageOptions {
  /**
   * Directory where the binary file lives.
   *
   * Relative paths are resolved against `process.cwd()`.
   * The directory (and any missing parents) are created automatically
   * on construction via `fs.mkdirSync(dir, { recursive: true })`.
   *
   * @default './data'
   */
  dir?: string;

  /**
   * Name of the binary file backing this storage station.
   *
   * Use the `.bin` extension by convention, but any extension works.
   *
   * @default 'storage.bin'
   */
  file?: string;

  /**
   * Whether to persist writes to disk after each operation.
   *
   * When `false`, written values are buffered in memory.
   * Use {@link BinaryStorageAPI.write.flush} to manually
   * persist the buffer at any time.
   *
   * This is the same pattern as {@link StorageOptions.flush} —
   * batch mode avoids redundant disk I/O when writing many
   * values in quick succession.
   *
   * @default true
   */
  flush?: boolean;
}

/**
 * Type tags — a 1-byte prefix before every value in the binary file.
 *
 * Each value in the binary file starts with one of these tags,
 * followed by the type-specific payload. This enables the read
 * methods to:
 *
 * 1. **Validate** that the next value matches expectations
 *    (a `read.num()` on a string position throws immediately).
 * 2. **Skip** unknown values via `read.any()` which auto-detects
 *    the type from the tag.
 * 3. **Detect corruption** — an unknown tag byte means the file
 *    is damaged or was written by a newer version.
 *
 * Tags are stored as `const enum` so they are inlined as numeric
 * literals at compile time — zero runtime overhead.
 *
 * ```
 * Byte layout for each value:
 *
 *   [1 byte tag] [payload...]
 *
 *   Number:  [0x01] [8 bytes float64 LE]
 *   String:  [0x02] [4 bytes uint32 LE length] [UTF-8 bytes]
 *   Boolean: [0x03] [1 byte: 0x00=false, 0x01=true]
 *   Object:  [0x04] [4 bytes uint32 LE length] [JSON UTF-8 bytes]
 *   Array:   [0x05] [4 bytes uint32 LE length] [JSON UTF-8 bytes]
 *   Null:    [0x06]
 * ```
 */
export const enum TypeTag {
  /** IEEE 754 double-precision float, little-endian. 8 bytes. */
  Number  = 0x01,
  /** UTF-8 encoded string with 4-byte little-endian length prefix. */
  String  = 0x02,
  /** Single byte: `0x00` = false, `0x01` = true. */
  Boolean = 0x03,
  /** JSON-serialised object stored as a length-prefixed UTF-8 string. */
  Object  = 0x04,
  /** JSON-serialised array stored as a length-prefixed UTF-8 string. */
  Array   = 0x05,
  /** Sentinel for null/undefined. No payload bytes. */
  Null    = 0x06,
}

/**
 * Human-readable name for each type tag.
 *
 * Used in error messages so that instead of
 * "expected 0x01, got 0x02" the user sees
 * "Expected number, got string".
 */
export const TAG_NAMES: Record<TypeTag, string> = {
  [TypeTag.Number]:  'number',
  [TypeTag.String]:  'string',
  [TypeTag.Boolean]: 'boolean',
  [TypeTag.Object]:  'object',
  [TypeTag.Array]:   'array',
  [TypeTag.Null]:    'null',
};

/**
 * The public API returned by {@link createBinaryStorage}.
 *
 * All writes are serialised through an internal promise chain,
 * so concurrent `write.*()` calls are safe. Reads are asynchronous
 * but execute synchronously from an in-memory buffer — the
 * `Promise` wrapper exists for API consistency with the key-value
 * {@link StorageAPI}.
 *
 * Values are consumed by `read.*()` exactly once: after reading,
 * the internal cursor advances past the consumed value. Use
 * `resetRead()` or `seekRead()` to re-read from a known position.
 */
export interface BinaryStorageAPI {
  /**
   * Typed write methods — append values to the end of the stream.
   *
   * Each method is internally queued, so you can fire multiple
   * writes without `await` and they will execute in order.
   */
  write: {
    /**
     * Append a number.
     *
     * Stored as IEEE 754 float64 little-endian (8 bytes).
     * Supports all JS number values including `Infinity`,
     * `-Infinity`, and `NaN`.
     */
    num(value: number): Promise<void>;

    /**
     * Append a string.
     *
     * Stored with a 4-byte uint32 LE length prefix followed by
     * the UTF-8 encoded bytes. Supports empty strings and
     * multi-byte characters (emoji, CJK, etc.).
     */
    str(value: string): Promise<void>;

    /**
     * Append a boolean.
     *
     * Stored as a single byte: `0x00` for `false`,
     * `0x01` for `true`.
     */
    b(value: boolean): Promise<void>;

    /**
     * Append an object (generic — preserves the type for reads).
     *
     * The object is JSON-serialised and stored with the `Object`
     * type tag (0x04). On read, it is JSON-parsed back to the
     * generic type `T`.
     */
    obj<T extends object>(value: T): Promise<void>;

    /**
     * Append an array (generic — preserves the element type for reads).
     *
     * The array is JSON-serialised and stored with the `Array`
     * type tag (0x05). On read, it is JSON-parsed back to `T[]`.
     */
    arr<T>(value: T[]): Promise<void>;

    /**
     * Append any value, auto-detecting its type.
     *
     * Type detection follows `typeof` + `Array.isArray`:
     * number → `TypeTag.Number`, string → `TypeTag.String`,
     * boolean → `TypeTag.Boolean`, null/undefined → `TypeTag.Null`,
     * Array → `TypeTag.Array`, object → `TypeTag.Object`.
     */
    any(value: unknown): Promise<void>;

    /**
     * Append a null sentinel (`TypeTag.Null`, no payload).
     */
    null(): Promise<void>;

    /**
     * Force-persist the in-memory write buffer to disk.
     *
     * Normally you don't need this — when `flush: true` (default),
     * every write auto-flushes. Use this when you created the
     * station with `flush: false` for batch writes.
     *
     * This always writes regardless of the `flush` option.
     */
    flush(): Promise<void>;
  };

  /**
   * Typed read methods — consume values sequentially.
   *
   * Each method reads the 1-byte type tag, validates it against
   * the expected type, then reads and returns the payload.
   * Throws if the type tag doesn't match or if there is no more
   * data to read (end of stream).
   */
  read: {
    /**
     * Read the next number.
     *
     * @throws If the next value is not a number (type mismatch).
     * @throws If there is no more data (end of stream).
     */
    num(): Promise<number>;

    /**
     * Read the next string.
     *
     * @throws If the next value is not a string (type mismatch).
     * @throws If there is no more data (end of stream).
     */
    str(): Promise<string>;

    /**
     * Read the next boolean.
     *
     * @throws If the next value is not a boolean (type mismatch).
     * @throws If there is no more data (end of stream).
     */
    b(): Promise<boolean>;

    /**
     * Read the next object (parsed from JSON).
     *
     * @typeParam T — The expected shape of the object.
     * @throws If the next value is not an object (type mismatch).
     * @throws If there is no more data (end of stream).
     */
    obj<T extends object>(): Promise<T>;

    /**
     * Read the next array (parsed from JSON).
     *
     * @typeParam T — The expected element type.
     * @throws If the next value is not an array (type mismatch).
     * @throws If there is no more data (end of stream).
     */
    arr<T>(): Promise<T[]>;

    /**
     * Read the next value and return it, auto-detecting the type
     * from the tag byte.
     *
     * This is the universal read method — it accepts any type.
     * Use it when you don't know the next value's type ahead of
     * time (e.g. reading a mixed-type stream written with
     * `write.any()`).
     *
     * @returns The value: number, string, boolean, object, array,
     *          or null.
     * @throws If there is no more data (end of stream).
     * @throws If the type tag is unknown (corrupt file).
     */
    any(): Promise<unknown>;
  };

  /**
   * Current read-cursor position in bytes.
   *
   * This is the byte offset from the beginning of the file
   * where the next `read.*()` call will start reading.
   *
   * Use this together with `seekRead()` to bookmark positions:
   *
   * ```ts
   * const bookmark = bin.tellRead();
   * // ... read some values ...
   * bin.seekRead(bookmark);  // back to bookmarked position
   * ```
   */
  tellRead(): number;

  /**
   * Current write-cursor position in bytes.
   *
   * This equals the total number of bytes written so far
   * (including both flushed and unflushed data). It is
   * always `>= tellRead()`.
   *
   * When reading a stream, `tellRead() < tellWrite()`
   * means there are still unread values.
   */
  tellWrite(): number;

  /**
   * Move the read cursor to an absolute byte offset.
   *
   * The position must be within `[0, tellWrite()]`.
   *
   * @throws If `pos` is out of range.
   *
   * **Warning:** No validation is performed on whether `pos`
   * aligns to a value boundary. If you seek to the middle of a
   * value, the next `read.*()` call will read garbage and likely
   * throw a type-mismatch or corrupt-file error. Always seek to
   * positions previously recorded with `tellRead()` or
   * `tellWrite()`.
   */
  seekRead(pos: number): void;

  /**
   * Move the write cursor and truncate data beyond this point.
   *
   * This is how you implement "undo": seek the write cursor
   * back to a previously recorded position, and everything
   * written after that point is discarded permanently.
   *
   * If the read cursor is past the new write position, it is
   * clamped to the write position automatically.
   *
   * This operation is serialised (queued) and triggers a flush.
   *
   * @throws If `pos < 0`.
   */
  seekWrite(pos: number): Promise<void>;

  /**
   * Reset the read cursor to the beginning of the stream.
   *
   * Equivalent to `seekRead(0)`. Useful for replaying data:
   * write a sequence, then `resetRead()` to consume it from
   * the start.
   */
  resetRead(): void;

  /**
   * Truncate the file at the current read cursor position.
   *
   * All data from the read cursor onward is discarded.
   * This is a convenience shorthand for
   * `seekWrite(tellRead())`.
   *
   * Typical use case: after consuming (reading) values you
   * no longer need, call `truncate()` to reclaim disk space.
   */
  truncate(): Promise<void>;
}
