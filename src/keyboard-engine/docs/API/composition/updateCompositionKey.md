# updateCompositionKey

Update a registered composition key entry identified by its trigger key name and flags array.

The old entry is removed and a merged entry (old fields + new overrides, preserving `key` and `flags`) is re-registered.

## Signature

```ts
// On KeyboardEngine:
updateCompositionKey(
  key: string,
  flags: Flags,
  updates: Partial<Omit<CompositioKey<TComponet>, 'key' | 'flags'>>,
): boolean

// On CompositionEngine (engine.composition):
updateCompositionKey(key, flags, updates): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `key` | `string` | The trigger key name of the entry to update. |
| `flags` | `Flags` (`{ need: string, become: string }[]`) | The flags array of the entry. Together with `key`, this uniquely identifies the entry via `areFlagsEqual`. |
| `updates` | `Partial<Omit<CompositioKey, 'key' \| 'flags'>>` | Fields to merge. `key` and `flags` cannot be changed. |

## Returns

`true` if the entry was found and updated, `false` if no entry matched.

## Usage

```ts
engine.registryCompositionKey({
  key: '3',
  flags: [],
  alternativeFlag: 'times',
  needs: [],
  optional: true,
  execute: (ctx) => ({ value: 3, lastFlag: 'times', steps: [...ctx.steps, '3'] }),
});

// Identify by empty flags array
engine.updateCompositionKey('3', [], { timeout: 200 });

// Entry with explicit flags
engine.registryCompositionKey({
  key: 's',
  flags: [{ need: 'times', become: 'scalar' }],
  alternativeFlag: 'unknown',
  needs: ['times'],
});

engine.updateCompositionKey('s', [{ need: 'times', become: 'scalar' }], { timeout: 600 });
```

## API interactions

- **[`registryCompositionKey`](./registryCompositionKey.md)** — register new entries; use `updateCompositionKey` to modify existing ones
- **[`removeCompositionKey`](./removeCompositionKey.md)** — remove all entries under a key name; use `updateCompositionKey` for targeted modification
- **[`setValueSchema`](./setValueSchema.md)** — schema-based validation applies to the updated `execute` callback immediately
