import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ZodType } from 'zod';
import type { StorageOptions, StorageAPI, StoreData } from './types.js';

/**
 * A key-value storage station backed by a single JSON file.
 *
 * Each instance manages one JSON file on disk. All read/write operations
 * are asynchronous and serialised internally — concurrent callers never
 * interleave. The file is loaded lazily on the first access, and writes
 * use atomic rename (write to `.tmp` then rename) to prevent data
 * corruption from partial writes or crashes.
 *
 * Instances are created via {@link createStorage}, not directly.
 */
export class Storage implements StorageAPI {
  private options: Required<StorageOptions>;
  private data: StoreData | null = null;
  private pending: Promise<void> = Promise.resolve();
  private filePath: string;

  constructor(options?: StorageOptions) {
    this.options = {
      dir: options?.dir ?? './data',
      file: options?.file ?? 'config.json',
      flush: options?.flush ?? true,
    };
    this.filePath = path.resolve(this.options.dir, this.options.file);
    this.ensureDir();
  }

  /**
   * Typed write methods.
   *
   * Each method writes a value of the corresponding type to the given key.
   * The write is serialised: it waits for any pending writes to complete,
   * then atomically persists the updated JSON to disk.
   *
   * `any` is the untyped escape hatch — it accepts any value and performs
   * no type-checking on subsequent reads unless you use a typed read method.
   */
  write = {
    /** Persist a numeric value under `key`. */
    num: (key: string, value: number) => this.setValue(key, value),
    /** Persist a string value under `key`. */
    str: (key: string, value: string) => this.setValue(key, value),
    /** Persist a boolean value under `key`. */
    b: (key: string, value: boolean) => this.setValue(key, value),
    /** Persist a plain object under `key`. */
    obj: <T extends object>(key: string, value: T) => this.setValue(key, value),
    /** Persist an array under `key`. */
    arr: <T>(key: string, value: T[]) => this.setValue(key, value),
    /** Persist any value under `key`. No type constraint. */
    any: (key: string, value: unknown) => this.setValue(key, value),
    /** Persist any value under `key`. Symmetric alias for `any`. */
    schema: <T>(key: string, value: T) => this.setValue(key, value),
  };

  /**
   * Typed read methods.
   *
   * Each method reads the value at `key` and validates that it matches the
   * expected type. If the key is missing or the stored value has a different
   * type, `defaultValue` is returned **and the file is repaired** so that
   * subsequent reads hit the correct value.
   */
  read = {
    /** Read a number. Returns `defaultValue` if missing or wrong type. */
    num: (key: string, defaultValue: number) =>
      this.getValue(key, defaultValue, 'number'),
    /** Read a string. Returns `defaultValue` if missing or wrong type. */
    str: (key: string, defaultValue: string) =>
      this.getValue(key, defaultValue, 'string'),
    /** Read a boolean. Returns `defaultValue` if missing or wrong type. */
    b: (key: string, defaultValue: boolean) =>
      this.getValue(key, defaultValue, 'boolean'),
    /** Read a plain object (generic). Returns `defaultValue` if missing or wrong type. */
    obj: <T extends object>(key: string, defaultValue: T) =>
      this.getValue(key, defaultValue, 'object'),
    /** Read an array (generic). Returns `defaultValue` if missing or wrong type. */
    arr: <T>(key: string, defaultValue: T[]) =>
      this.getValue(key, defaultValue, 'array'),
    /** Read any value. Returns `defaultValue` if missing. No type validation. */
    any: <T>(key: string, defaultValue: T) =>
      this.getValue(key, defaultValue, 'any'),
    /** Read a value validated against a zod schema. Auto-repairs on parse failure. */
    schema: <T>(key: string, schema: ZodType<T>, defaultValue: T) =>
      this.getValueWithSchema(key, schema, defaultValue),
  };

  /**
   * Check whether a key exists in the store.
   *
   * @returns `true` if the key has an entry (even if its value is `null`
   *          or `undefined` — it checks own-property presence).
   */
  async has(key: string): Promise<boolean> {
    await this.ensureLoaded();
    return Object.prototype.hasOwnProperty.call(this.data, key);
  }

  /**
   * Remove a key and its value from the store.
   *
   * If the key does not exist this is a no-op (no error thrown).
   */
  async delete(key: string): Promise<void> {
    await this.ensureLoaded();
    if (Object.prototype.hasOwnProperty.call(this.data, key)) {
      delete this.data![key];
      await this.flush();
    }
  }

  /**
   * Remove all keys from the store, resetting it to an empty object.
   */
  async clear(): Promise<void> {
    this.data = {};
    await this.flush();
  }

  /**
   * Return a shallow copy of the entire raw data object.
   *
   * Modifications to the returned object do **not** affect the store
   * (use the write methods to persist changes).
   */
  async getAll(): Promise<Record<string, unknown>> {
    await this.ensureLoaded();
    return { ...this.data };
  }

  private ensureDir(): void {
    fs.mkdirSync(this.options.dir, { recursive: true });
  }

  /**
   * Serialise access so concurrent callers never interleave.
   *
   * Each task is chained onto `this.pending` using `.then(task, task)`.
   * The second argument ensures that even if a previous task rejects,
   * the next task still runs (the chain is never broken).
   */
  private enqueue(task: () => Promise<void>): Promise<void> {
    this.pending = this.pending.then(task, task);
    return this.pending;
  }

  private setValue(key: string, value: unknown): Promise<void> {
    return this.enqueue(async () => {
      await this.ensureLoaded();
      this.data![key] = value;
      await this.flush();
    });
  }

  /**
   * Read a value with type validation and automatic repair.
   *
   * If the key is missing the default is written to disk so that
   * subsequent reads return it directly. If the stored value has a
   * different type than expected, the default replaces it on disk.
   */
  private async getValue<T>(
    key: string,
    defaultValue: T,
    expectedType: 'number' | 'string' | 'boolean' | 'object' | 'array' | 'any',
  ): Promise<T> {
    await this.ensureLoaded();
    const stored = this.data![key];

    if (stored === undefined) {
      this.data![key] = defaultValue;
      await this.flush();
      return defaultValue;
    }

    let valid = false;
    if (expectedType === 'number') valid = typeof stored === 'number';
    else if (expectedType === 'string') valid = typeof stored === 'string';
    else if (expectedType === 'boolean') valid = typeof stored === 'boolean';
    else if (expectedType === 'array') valid = Array.isArray(stored);
    else if (expectedType === 'object')
      valid = typeof stored === 'object' && stored !== null && !Array.isArray(stored);
    else valid = true;

    if (!valid) {
      this.data![key] = defaultValue;
      await this.flush();
      return defaultValue;
    }

    return stored as T;
  }

  /**
   * Read a value and validate it against a zod schema.
   *
   * On success the parsed value is returned (including any transforms
   * or coercions the schema applies). On failure — missing key or
   * schema parse error — `defaultValue` is written to disk and returned.
   */
  private async getValueWithSchema<T>(
    key: string,
    schema: ZodType<T>,
    defaultValue: T,
  ): Promise<T> {
    await this.ensureLoaded();
    const stored = this.data![key];

    if (stored === undefined) {
      this.data![key] = defaultValue;
      await this.flush();
      return defaultValue;
    }

    const result = schema.safeParse(stored);
    if (result.success) {
      return result.data;
    }

    this.data![key] = defaultValue;
    await this.flush();
    return defaultValue;
  }

  /**
   * Load data from disk on first access (lazy initialisation).
   *
   * Once loaded the data stays in memory for the lifetime of the
   * instance. File-not-found and corrupt-JSON errors are silently
   * swallowed — in both cases we start with an empty store.
   */
  private async ensureLoaded(): Promise<void> {
    if (this.data !== null) return;

    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      this.data =
        typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
          ? (parsed as StoreData)
          : {};
    } catch {
      this.data = {};
    }
  }

  /**
   * Atomically persist the in-memory data to disk.
   *
   * Writes to a `.tmp` file first, then renames it over the target
   * file. This guarantees that the on-disk file is always either the
   * complete previous version or the complete new version — never a
   * partially-written mess.
   *
   * No-op when `options.flush` is `false`.
   */
  private async flush(): Promise<void> {
    if (!this.options.flush) return;

    const tmpPath = this.filePath + '.tmp';
    const content = JSON.stringify(this.data, null, 2);

    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, this.filePath);
  }
}
