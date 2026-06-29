# createStorage

Create a typed async key-value store backed by a JSON file.

## Signature

```ts
function createStorage(options?: StorageOptions): StorageAPI
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dir` | `string` | `'./data'` | Directory path (relative to cwd). Created if missing. |
| `file` | `string` | `'config.json'` | JSON file name. |
| `flush` | `boolean` | `true` | Write to disk immediately. When `false`, changes stay in memory. |

## Returns

`StorageAPI` with typed read/write methods:

| Method | Description |
|--------|-------------|
| `write.num(key, value)` | Write a number. |
| `write.str(key, value)` | Write a string. |
| `write.b(key, value)` | Write a boolean. |
| `write.obj(key, value)` | Write an object. |
| `write.arr(key, value)` | Write an array. |
| `write.any(key, value)` | Write any value. |
| `write.schema(key, value)` | Write with Zod validation. |
| `read.num(key, default)` | Read a number (auto-repair on type mismatch). |
| `read.str(key, default)` | Read a string. |
| `read.b(key, default)` | Read a boolean. |
| `read.obj(key, default)` | Read an object. |
| `read.arr(key, default)` | Read an array. |
| `read.any(key, default)` | Read any value. |
| `read.schema(key, schema, default)` | Read with Zod validation. |
| `has(key)` | Check if key exists. |
| `delete(key)` | Remove a key. |
| `clear()` | Remove all keys. |
| `getAll()` | Return all stored key-value pairs. |

All methods are async. Writes are atomic (via `.tmp` → `rename`). On type mismatch during read, the default value is written back and returned (auto-repair).

## Best Practice

Create one store per concern:

```ts
const settings = createStorage({ file: 'settings.json' });
const scores = createStorage({ file: 'scores.json' });

// Write
await settings.write.str('theme', 'dark');

// Read with default fallback
const theme = await settings.read.str('theme', 'light');
```
