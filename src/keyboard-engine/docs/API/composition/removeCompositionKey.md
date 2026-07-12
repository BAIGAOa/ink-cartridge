# removeCompositionKey / clearAllCompositionKeys

Remove composition key entries from the mapping table.

## Signatures

```ts
// On KeyboardEngine:
removeCompositionKey(key: string): boolean
clearAllCompositionKeys(): void

// On CompositionEngine (engine.composition):
removeCompositionKey(key: string): boolean
clearAllCompositionKeys(): void
```

## Parameters

| Method | Param | Description |
|--------|-------|-------------|
| `removeCompositionKey` | `key` | The trigger key name to remove. Deletes all entries registered under this name. |
| `clearAllCompositionKeys` | — | Remove every registered composition key. |

## Returns

`removeCompositionKey` returns `true` if an entry was removed, `false` if no entry existed for that key.

## Effect

`removeCompositionKey` deletes the entire Set from `keyMappingTable` for the given key. `clearAllCompositionKeys` clears the entire Map. Neither cancels an active pending chain — if a chain is currently pending and its entries are removed, the chain continues with its already-started context until timeout.

To cancel the pending chain, call [`abortComposition`](./abortComposition.md).

## Usage

```ts
engine.registryCompositionKey({ key: '3', flag: 'times', needs: [], optional: true });
engine.removeCompositionKey('3');  // removes all '3' entries

engine.clearAllCompositionKeys();  // wipe everything
```

## API interactions

- **[`registryCompositionKey`](./registryCompositionKey.md)** — the inverse; register new entries
- **[`abortComposition`](./abortComposition.md)** — cancel any active pending chain (removing entries does not cancel)
- **[`updateCompositionKey`](./updateCompositionKey.md)** — modify a single entry by key+flag instead of removing all entries for a key
