import type { ZodType } from 'zod';

/**
 * Configuration for {@link createStorage}.
 *
 * All properties are optional — sensible defaults are provided so that
 * calling `createStorage()` with no arguments just works.
 */
export interface StorageOptions {
  /**
   * Directory where the JSON file lives.
   *
   * Relative paths are resolved against `process.cwd()`.
   * The directory (and any missing parents) are created automatically
   * on construction via `fs.mkdirSync(dir, { recursive: true })`.
   *
   * @default './data'
   */
  dir?: string;

  /**
   * Name of the JSON file backing this storage station.
   *
   * @default 'config.json'
   */
  file?: string;

  /**
   * Whether to write changes to disk immediately after each operation.
   *
   * When `false`, in-memory mutations are not persisted until you
   * manually trigger a flush (or set this back to `true` on a subsequent
   * write). Useful for batch writes where you want to avoid multiple
   * disk I/O round-trips.
   *
   * @default true
   */
  flush?: boolean;
}

/**
 * Resolved storage configuration with every default filled in.
 *
 * Internal use only — you never need to construct this manually.
 */
export interface ResolvedStorageOptions {
  dir: string;
  file: string;
  flush: boolean;
}

/**
 * The public API returned by {@link createStorage}.
 *
 * Provides typed read/write accessors, key management helpers, and
 * a method to dump the entire store. All methods are async and
 * serialised internally — callers never need to worry about concurrent
 * access to the same file.
 */
export interface StorageAPI {
  /**
   * Typed write methods.
   *
   * Each method persists a value of the corresponding type.
   * Writes are serialised: calling `write.num('a', 1)` followed
   * immediately by `write.num('b', 2)` will reliably write both keys
   * in order.
   */
  write: {
    /** Write a numeric value. */
    num(key: string, value: number): Promise<void>;
    /** Write a string value. */
    str(key: string, value: string): Promise<void>;
    /** Write a boolean value. */
    b(key: string, value: boolean): Promise<void>;
    /** Write a plain object (generic — preserves the type for reads). */
    obj<T extends object>(key: string, value: T): Promise<void>;
    /** Write an array (generic — preserves the element type for reads). */
    arr<T>(key: string, value: T[]): Promise<void>;
    /** Write any value. No type constraint; use with `read.any`. */
    any(key: string, value: unknown): Promise<void>;
    /** Write any value (alias for `any` — kept symmetric with `read.schema`). */
    schema<T>(key: string, value: T): Promise<void>;
  };

  /**
   * Typed read methods.
   *
   * Each method validates the stored value against the expected type.
   * If the key is missing or the type is wrong, `defaultValue` is
   * returned and the file is automatically repaired.
   */
  read: {
    /** Read a number. Returns `defaultValue` on missing key or type mismatch. */
    num(key: string, defaultValue: number): Promise<number>;
    /** Read a string. Returns `defaultValue` on missing key or type mismatch. */
    str(key: string, defaultValue: string): Promise<string>;
    /** Read a boolean. Returns `defaultValue` on missing key or type mismatch. */
    b(key: string, defaultValue: boolean): Promise<boolean>;
    /** Read a plain object. Returns `defaultValue` on missing key or type mismatch. */
    obj<T extends object>(key: string, defaultValue: T): Promise<T>;
    /** Read an array. Returns `defaultValue` on missing key or type mismatch. */
    arr<T>(key: string, defaultValue: T[]): Promise<T[]>;
    /** Read any value. Returns `defaultValue` on missing key (no type validation). */
    any<T>(key: string, defaultValue: T): Promise<T>;
    /**
     * Read a value validated against a zod schema.
     *
     * On success the parsed value is returned (including any zod transforms
     * or coercions applied by the schema). On failure — missing key, schema
     * parse error, or wrong shape — `defaultValue` is returned and the file
     * is automatically repaired.
     *
     * @param key          The key to read.
     * @param schema       A zod schema to validate the stored value against.
     * @param defaultValue Fallback value used when validation fails.
     */
    schema<T>(key: string, schema: ZodType<T>, defaultValue: T): Promise<T>;
  };

  /**
   * Check whether a key exists in the store.
   *
   * @returns `true` if the key has an own-property entry, even if
   *          its value is `null` or `undefined`.
   */
  has(key: string): Promise<boolean>;

  /**
   * Remove a key and its value.
   *
   * No-op when the key does not exist.
   */
  delete(key: string): Promise<void>;

  /**
   * Remove all keys, resetting the store to an empty object.
   */
  clear(): Promise<void>;

  /**
   * Return a shallow copy of the entire data object.
   *
   * Changes to the returned object are **not** persisted — use the
   * write methods for that.
   */
  getAll(): Promise<Record<string, unknown>>;
}

/**
 * Internal data store — a flat key-value map serialised as JSON.
 *
 * The top-level JSON structure is always an object. Arrays and
 * primitives at the top level are rejected on load (treated as corrupt).
 */
export type StoreData = Record<string, unknown>;
