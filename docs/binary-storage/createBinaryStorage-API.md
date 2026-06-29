# createBinaryStorage

Create a sequential binary FIFO store with independent read and write cursors.

## Signature

```ts
function createBinaryStorage(options?: BinaryStorageOptions): BinaryStorageAPI
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dir` | `string` | `'./data'` | Directory path. |
| `file` | `string` | `'storage.bin'` | Binary file name. |
| `flush` | `boolean` | `true` | Write to disk immediately. |

## Returns

`BinaryStorageAPI`:

| Method | Description |
|--------|-------------|
| `write.num(v)` | Write a float64. |
| `write.str(v)` | Write a UTF-8 string. |
| `write.b(v)` | Write a boolean. |
| `write.obj(v)` | Write an object (JSON). |
| `write.arr(v)` | Write an array (JSON). |
| `write.null()` | Write null. |
| `write.any(v)` | Auto-detect type and write. |
| `write.flush()` | Force persist to disk. |
| `read.num()` | Read a float64. |
| `read.str()` | Read a string. |
| `read.b()` | Read a boolean. |
| `read.obj()` | Read an object. |
| `read.arr()` | Read an array. |
| `read.any()` | Auto-detect and read next value. |
| `tellRead()` / `tellWrite()` | Cursor positions. |
| `seekRead(pos)` / `seekWrite(pos)` | Move cursors. |
| `resetRead()` | Reset read cursor to 0. |
| `truncate()` | Discard everything after read cursor. |

Writes are serialised through a promise chain. Atomic flush via `.tmp` → `rename`. Values are encoded with a 1-byte type tag:

| Tag | Type | Payload |
|-----|------|---------|
| `0x01` | Number | 8 bytes float64 LE |
| `0x02` | String | 4 bytes length + UTF-8 |
| `0x03` | Boolean | 1 byte |
| `0x04` | Object | JSON UTF-8 |
| `0x05` | Array | JSON UTF-8 |
| `0x06` | Null | none |

## Best Practice

```ts
const log = createBinaryStorage({ file: 'events.bin' });

await log.write.str('user.login');
await log.write.obj({ user: 'alice', time: Date.now() });

// Replay from start
log.resetRead();
const event = await log.read.str(); // 'user.login'
```
