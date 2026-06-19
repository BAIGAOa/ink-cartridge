# Persistence System

ink-kit provides a **zero-config key-value persistence system** backed by JSON files. You get typed read/write methods with automatic type validation, default-value fallback, atomic writes, and built-in concurrency control — all without touching `fs` directly.

---

## Quick Start

```ts
import { createStorage } from '@baigao_h/ink-kit';

const config = createStorage();

// Write typed values
await config.write.str('username', 'Alice');
await config.write.num('volume', 80);
await config.write.obj('window', { width: 120, height: 40 });

// Read with defaults — auto-repairs on mismatch
const name   = await config.read.str('username', 'Guest');   // 'Alice'
const vol    = await config.read.num('volume', 50);          // 80
const win    = await config.read.obj('window', { width: 80, height: 24 });
// { width: 120, height: 40 }
```

---

## Concepts

### Default Storage Station

Calling `createStorage()` with no arguments creates a station backed by `./data/config.json`. The directory is created automatically if it doesn't exist — you never need to `mkdir` first.

```ts
const storage = createStorage();
// File: ./data/config.json
```

### Custom Stations

You can create as many independent stations as you need:

```ts
const gameSaves  = createStorage({ dir: './saves', file: 'slot1.json' });
const coreConfig = createStorage({ dir: './config', file: 'core.json' });
const cache      = createStorage({ dir: './tmp', file: 'cache.json' });
```

Each station manages its own JSON file and its own in-memory cache — they never interfere.

### Typed Accessors

Every read/write method pair is type-specific:

| Type    | Write              | Read              |
| ------- | ------------------ | ----------------- |
| number  | `write.num(k, v)`  | `read.num(k, d)`  |
| string  | `write.str(k, v)`  | `read.str(k, d)`  |
| boolean | `write.b(k, v)`    | `read.b(k, d)`    |
| object  | `write.obj(k, v)`  | `read.obj(k, d)`  |
| array   | `write.arr(k, v)`  | `read.arr(k, d)`  |
| any     | `write.any(k, v)`  | `read.any(k, d)`  |

The `obj` and `arr` methods are generic — TypeScript infers the return type from the default value you provide:

```ts
interface WindowSize { width: number; height: number; }

const w = await config.read.obj<WindowSize>('window', { width: 80, height: 24 });
// w is typed as WindowSize
```

### Type Validation & Auto-Repair

Every `read.*` call (except `read.any`) validates the stored value against the expected type:

- If the **key is missing**, the default value is written to disk and returned.
- If the **stored value has a different type** (e.g. string where a number was expected), the default value replaces the corrupt entry on disk and is returned.

This means your code always gets back a valid value — you never need to check for `undefined` or handle type errors after a `read` call.

```ts
// Someone (or a bug) wrote a string where a number should be
await config.write.any('volume', 'loud');

// read.num detects the mismatch and repairs the file
const vol = await config.read.num('volume', 50); // 50
// File now contains: { "volume": 50 }
```

### Atomic Writes

Every `write` operation uses the **write-to-temp-then-rename** pattern:

1. Serialise the in-memory data to JSON.
2. Write the JSON to `file.json.tmp`.
3. `fs.renameSync('file.json.tmp', 'file.json')`.

On POSIX systems `rename` is atomic — the on-disk file is always either the complete old version or the complete new version. A crash mid-write leaves the original file intact (the `.tmp` file may linger, but it never corrupts the real file).

### Concurrency Control

Writes are serialised through an internal Promise chain. If you fire three writes in quick succession:

```ts
config.write.num('a', 1);
config.write.num('b', 2);
config.write.num('c', 3);
```

They are guaranteed to execute in order — write `b` waits for write `a` to finish, and so on. Subsequent reads always see the latest committed state.

### Lazy Loading

The JSON file is read from disk only on the **first access** (first read or write). After that the data lives in memory for the lifetime of the instance. This avoids unnecessary I/O for stations that are created but never used.

### Error Recovery

If the backing file contains invalid JSON (partial write, manual edit mistake, etc.), the system silently starts with an empty store. The corrupt file is overwritten on the next write.

---

## API Reference

### createStorage

```ts
function createStorage(options?: StorageOptions): StorageAPI;
```

Factory function that creates a new storage station.

**StorageOptions**

| Property | Type    | Default         | Description                          |
| -------- | ------- | --------------- | ------------------------------------ |
| dir      | string  | `'./data'`      | Directory for the JSON file          |
| file     | string  | `'config.json'` | File name                           |
| flush    | boolean | `true`          | Whether to persist writes immediately |

---

### storage.write

```ts
storage.write.num(key: string, value: number): Promise<void>;
storage.write.str(key: string, value: string): Promise<void>;
storage.write.b(key: string, value: boolean): Promise<void>;
storage.write.obj<T extends object>(key: string, value: T): Promise<void>;
storage.write.arr<T>(key: string, value: T[]): Promise<void>;
storage.write.any(key: string, value: unknown): Promise<void>;
```

Persist a value under the given key. Writes are serialised and atomic.

`b` is the boolean-specific method — use it for `true`/`false` values. `any` is the untyped escape hatch — it accepts any value and performs no type constraint.

```ts
await config.write.str('theme', 'dark');
await config.write.num('fontSize', 14);
await config.write.b('darkMode', true);
await config.write.obj('lastSession', { file: 'todo.md', line: 42 });
await config.write.arr('recentFiles', ['a.ts', 'b.ts']);
```

---

### storage.read

```ts
storage.read.num(key: string, defaultValue: number): Promise<number>;
storage.read.str(key: string, defaultValue: string): Promise<string>;
storage.read.b(key: string, defaultValue: boolean): Promise<boolean>;
storage.read.obj<T extends object>(key: string, defaultValue: T): Promise<T>;
storage.read.arr<T>(key: string, defaultValue: T[]): Promise<T[]>;
storage.read.any<T>(key: string, defaultValue: T): Promise<T>;
```

Read a value with type validation and automatic repair.

- **Missing key** → writes and returns `defaultValue`.
- **Wrong type** → overwrites the corrupt entry with `defaultValue` and returns it.
- **Valid value** → returns the stored value as-is.

```ts
const theme = await config.read.str('theme', 'light');
// If 'theme' key is missing → file gets { "theme": "light" }, returns 'light'
// If 'theme' is 123       → file gets { "theme": "light" }, returns 'light'
// If 'theme' is 'dark'    → returns 'dark'
```

---
### storage.read.schema

```ts
storage.read.schema<T>(key: string, schema: ZodType<T>, defaultValue: T): Promise<T>;
```

Read a value and validate it against a **zod schema**. This is the most powerful read method — it can validate nested objects, enums, unions, refinements, and apply transforms/coercions.

- **Missing key** → writes and returns `defaultValue`.
- **Schema parse failure** (wrong shape, invalid enum, etc.) → overwrites the corrupt entry with `defaultValue` and returns it.
- **Valid value** → returns the **parsed** data (including any zod transforms or coercions applied by the schema).

```ts
import { z } from 'zod';

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
});

// Valid data → returns parsed value
await storage.write.schema('user', { name: 'Alice', age: 30 });
const user = await storage.read.schema('user', userSchema, { name: '?', age: 0 });
// { name: 'Alice', age: 30 }

// Wrong shape → returns default + auto-repair
await storage.write.any('user', { name: 'Eve' }); // missing 'age'
const fixed = await storage.read.schema('user', userSchema, { name: '?', age: 0 });
// { name: '?', age: 0 } — file repaired

// Coercion: string → number
const num = await storage.read.schema('count', z.coerce.number(), 0);
// If stored value was "42", returns 42 (number)
```

**Supported zod features:** All — `z.object()`, `z.string()`, `z.number()`, `z.enum()`, `z.union()`, `z.refine()`, `z.transform()`, `z.coerce.*()`, etc.

**Tip:** Use `z.coerce.*()` schemas to gracefully upgrade legacy data. A field that was stored as the string `"42"` under a previous version can be read as a number with `z.coerce.number()`.

---
### storage.write.schema

```ts
storage.write.schema<T>(key: string, value: T): Promise<void>;
```

Write a value to a key. This is a thin alias for `write.any` — schemas are only validated on **read**, not write. It exists for API symmetry with `read.schema()`.

```ts
await storage.write.schema('user', { name: 'Bob', age: 25 });
// Equivalent to: await storage.write.any('user', { name: 'Bob', age: 25 });
```

---

### storage.has

```ts
storage.has(key: string): Promise<boolean>;
```

Check whether a key exists in the store. Returns `true` even if the value is `null` or `undefined` (it checks own-property presence, not truthiness).

```ts
if (await config.has('username')) {
  const name = await config.read.str('username', '');
}
```

---

### storage.delete

```ts
storage.delete(key: string): Promise<void>;
```

Remove a key and its value. No-op if the key does not exist.

```ts
await config.delete('temp-cache');
```

---

### storage.clear

```ts
storage.clear(): Promise<void>;
```

Remove all keys, resetting the store to an empty object. The file on disk is updated immediately.

```ts
await config.clear();
// File now contains: {}
```

---

### storage.getAll

```ts
storage.getAll(): Promise<Record<string, unknown>>;
```

Return a shallow copy of the entire raw data object. Modifications to the returned object are **not** persisted — use the write methods to make changes.

```ts
const all = await config.getAll();
console.log(Object.keys(all));
```

---

## Common Patterns

### Application Config

```ts
interface AppConfig {
  theme: string;
  fontSize: number;
  lastFile: string | null;
}

async function loadConfig(): Promise<AppConfig> {
  const theme    = await config.read.str('theme', 'dark');
  const fontSize = await config.read.num('fontSize', 14);
  const lastFile = await config.read.any<string | null>('lastFile', null);
  return { theme, fontSize, lastFile };
}

async function saveConfig(cfg: AppConfig): Promise<void> {
  await config.write.str('theme', cfg.theme);
  await config.write.num('fontSize', cfg.fontSize);
  await config.write.any('lastFile', cfg.lastFile);
}
```

### Batch Writes (Disable Flush)

```ts
import { createStorage } from '@baigao_h/ink-kit';

const store = createStorage({ file: 'batch.json', flush: false });

await store.write.num('a', 1);
await store.write.num('b', 2);
await store.write.num('c', 3);
// All three mutations are queued but never written to disk.
// Re-create with flush: true to persist, or call a write with
// a new instance that has flush enabled.
```

If you need fine-grained flush control after batch writes, create a second instance pointing at the same file with `flush: true` and write any value — this triggers a full flush of the current in-memory state.

### Multiple Stations for Data Separation

```ts
// User preferences → ~/.myapp/config.json
const prefs = createStorage({ dir: './config', file: 'prefs.json' });

// Game saves → ~/.myapp/saves/slot1.json
const slot1 = createStorage({ dir: './saves', file: 'slot1.json' });
const slot2 = createStorage({ dir: './saves', file: 'slot2.json' });

// Ephemeral cache → ~/.myapp/cache/session.json
const cache = createStorage({ dir: './cache', file: 'session.json' });
```

### Integration with Screen System

The storage system is independent of React/Ink — you can use it in non-UI code. But it fits naturally into screen components:

```tsx
function Settings() {
  const { back } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const [volume, setVolume] = useState(50);

  useEffect(() => {
    // Load saved volume on mount
    const prefs = createStorage();
    prefs.read.num('volume', 50).then(setVolume);
  }, []);

  useEffect(() => {
    boundKeyboard(['up'], async () => {
      const prefs = createStorage();
      const next = Math.min(100, volume + 5);
      setVolume(next);
      await prefs.write.num('volume', next);
    });
    boundKeyboard(['down'], async () => {
      const prefs = createStorage();
      const next = Math.max(0, volume - 5);
      setVolume(next);
      await prefs.write.num('volume', next);
    });
    boundKeyboard(['b'], () => back());
  }, [volume]);

  return <Text>Volume: {volume}</Text>;
}
```

---

## File Format

Each storage station is a single JSON file with a flat key-value object at the top level:

```json
{
  "username": "Alice",
  "volume": 80,
  "window": { "width": 120, "height": 40 },
  "recentFiles": ["a.ts", "b.ts"]
}
```

- The top-level value must be an object. Arrays or primitives at the top level are treated as corrupt data and the store is reset.
- Keys are arbitrary strings.
- Values can be numbers, strings, booleans, null, objects, or arrays — anything `JSON.stringify` handles.
- Whitespace formatting uses 2-space indentation for readability.

---

## Independence

This module has **zero dependencies on React, Ink, or any other part of ink-kit**. It uses only Node.js built-in modules (`fs`, `path`). You can import and use it in plain `.ts` files without any React context.
