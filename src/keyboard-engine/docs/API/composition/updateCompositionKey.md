# updateCompositionKey

Update a registered composition key entry identified by its trigger key name and flag.

The old entry is removed and a merged entry (old fields + new overrides, preserving `key` and `flag`) is re-registered. This allows modifying an entry's `execute`, `timeout`, `needs`, etc. without removing and re-registering.

## Signature

```ts
// On KeyboardEngine:
updateCompositionKey(
  key: string,
  flag: string,
  updates: Partial<Omit<CompositioKey<TComponet>, 'key' | 'flag'>>,
): boolean

// On CompositionEngine (engine.composition):
updateCompositionKey(key, flag, updates): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `key` | `string` | The trigger key name of the entry to update. |
| `flag` | `string` | The flag of the entry to update. Together with `key`, this uniquely identifies the entry. |
| `updates` | `Partial<Omit<CompositioKey, 'key' \| 'flag'>>` | Fields to merge into the existing entry. `key` and `flag` cannot be changed — they are the identity. |

## Returns

`true` if the entry was found and updated, `false` if no entry matched the `key` + `flag` pair.

## Effect

1. Finds the entry in the Set for `key` where `entry.flag === flag`
2. Removes the old entry from the Set
3. Creates a merged entry: `{ ...oldEntry, ...updates, key, flag }`
4. Adds the merged entry back to the Set

The identity (`key` + `flag`) is preserved — you cannot rename an entry. Create a new entry and remove the old one to change identity.

## Usage

```ts
engine.registryCompositionKey({
  key: '3',
  flag: 'times',
  needs: [],
  optional: true,
  execute: (ctx) => ({ value: 3, lastFlag: 'times', steps: [...ctx.steps, '3'] }),
});

// Change the timeout
engine.updateCompositionKey('3', 'times', { timeout: 200 });

// Replace the execute function
engine.updateCompositionKey('3', 'times', {
  execute: (ctx) => ({ value: 5, lastFlag: 'times', steps: [...ctx.steps, '3'] }),
});

// Update multiple fields
engine.updateCompositionKey('3', 'times', {
  timeout: 600,
  exclusive: true,
  when: () => isReady,
});
```

## API interactions

- **[`registryCompositionKey`](./registryCompositionKey.md)** — register new entries; use `updateCompositionKey` to modify existing ones
- **[`removeCompositionKey`](./removeCompositionKey.md)** — remove all entries under a key name; use `updateCompositionKey` for targeted modification
- **[`setValueSchema`](./setValueSchema.md)** — schema-based validation applies to the updated `execute` callback immediately
