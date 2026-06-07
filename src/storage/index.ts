import { Storage } from './storage.js';
import type { StorageOptions, StorageAPI } from './types.js';

/**
 * Create a key-value storage station backed by a JSON file.
 *
 * The returned {@link StorageAPI} provides typed `read.*` and `write.*`
 * methods that validate types at runtime and automatically repair
 * mismatches by writing the default value back to disk. All operations
 * are serialised internally — concurrent callers never interleave.
 *
 * @param options  Optional configuration for the storage directory,
 *                 file name, and flush behaviour.
 * @returns A typed storage API. Each instance is independent;
 *          you can create as many stations as you need.
 *
 * @example
 * ```ts
 * // Default storage station (./data/config.json)
 * const config = createStorage();
 *
 * // Custom station for game saves
 * const saves = createStorage({ dir: './saves', file: 'slot1.json' });
 *
 * // Write typed values
 * await config.write.str('username', 'Alice');
 * await config.write.num('volume', 80);
 * await config.write.obj('window', { width: 120, height: 40 });
 *
 * // Read with defaults (auto-repairs on mismatch)
 * const name = await config.read.str('username', 'Guest');
 * const vol  = await config.read.num('volume', 50);
 * const win  = await config.read.obj('window', { width: 80, height: 24 });
 *
 * // Key management
 * if (await config.has('username')) { ... }
 * await config.delete('temp-key');
 * await config.clear();
 * const all = await config.getAll();
 * ```
 *
 * @throws Never throws during construction. Read/write errors from
 *         the filesystem (permissions, disk full) propagate to the
 *         caller as standard Node.js `ErrnoException` objects.
 */
export function createStorage(options?: StorageOptions): StorageAPI {
  return new Storage(options);
}

export type { StorageOptions, StorageAPI };
