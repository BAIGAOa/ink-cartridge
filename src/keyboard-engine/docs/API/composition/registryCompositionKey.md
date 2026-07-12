# registryCompositionKey

Register a key entry in the composition mapping table.

Each entry represents a node in a composition chain. When a key matching the entry's `key` name is pressed, the composition engine checks whether a pending chain exists (and whether this entry's `needs` are satisfied), or starts a new chain if the entry is eligible (`optional: true` or empty `needs`).

## Signature

```ts
// On KeyboardEngine:
registryCompositionKey(entry: CompositioKey<TComponet>): void

// On CompositionEngine (engine.composition):
registryCompositionKey(entry: CompositioKey<TComponet>): void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `entry` | `CompositioKey` | A composition key entry. Multiple entries can share the same `key` name — the engine resolves the best match at runtime via `resolveCompositionKey`. |

### CompositioKey fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | `string` | **yes** | Trigger key name. |
| `flag` | `string` | **yes** | What this key is — consumed by the next key's `needs`. |
| `needs` | `string[]` | **yes** | Which preceding flags this key depends on. |
| `optional` | `boolean` | no | Can start a chain without a preceding flag (head key). |
| `execute` | `(ctx) => ctx \| null` | no | Transform the composition context. Return `null` to abort. |
| `timeout` | `number` | no | Per-key timeout override. Falls back to engine's `defaultTimeout`. |
| `exclusive` | `boolean` | no | Silently consume mismatched keys while pending. |
| `affectOverlay` | `boolean` | no | Fire in the overlay phase (`true`) or screen phase (`false`). |
| `when` | `(() => boolean) \| string` | no | Condition gating. |
| `mode` | `string` | no | Restrict to a specific mode. |
| `category` | `TComponet[] \| "*"` | no | Screen whitelist. |
| `executeWhenNoOverlay` | `boolean` | no | Fire with `affectOverlay: true` even when no overlay is active. |
| `KeyReleaseWhenChainInterrupted` | `boolean` | no | When `true` and the chain breaks (validation fail / execute returns null), swallow the key instead of releasing it to lower pipeline stages. |

## Returns

Nothing (`void`).

## Effect

Adds the entry to the internal `keyMappingTable: Map<string, Set<CompositioKey>>`. Multiple entries can share the same key name — they're stored in a Set so duplicates with identical identity are not added twice.

## Usage

```ts
engine.registryCompositionKey({
  key: '3',
  flag: 'times',
  needs: [],
  optional: true,
  execute: (ctx) => ({
    value: 3,
    lastFlag: 'times',
    steps: [...ctx.steps, '3'],
  }),
});

engine.registryCompositionKey({
  key: '3',
  flag: 'action',
  needs: ['times'],
  execute: (ctx) => {
    const count = ctx.value as number;
    // Fire the compound action after the first timed press
    console.log(`Repeated ${count} times`);
    return null; // End the chain
  },
});
```

## API interactions

- **[`removeCompositionKey`](./removeCompositionKey.md)** — remove all entries under a key name
- **[`updateCompositionKey`](./updateCompositionKey.md)** — modify an existing entry in place
- **[`abortComposition`](./abortComposition.md)** — cancel any active pending chain
- **[`setValueSchema`](./setValueSchema.md)** — validate `ctx.value` at each chain step via type guards
- **[`Mode System`](../mode-system.md)** — entries with `mode` set only fire in that mode
