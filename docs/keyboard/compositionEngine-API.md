# Composition Engine

A flag-and-needs-based key composition system for building chains of typed key presses. Each key declares what type it is (`flag`) and what type it expects to precede it (`needs`). A context object accumulates state as keys execute, enabling sequences like `3 → s → w` (3 × 10 = 30 newlines).

The composition engine is created automatically by `KeyboardEngine`. Access it via `engine.composition`, or call the delegation methods directly on the engine instance.

## Architecture

```
User presses:  3    s    w
                │    │    │
                ▼    ▼    ▼
              ┌─────────────────────────┐
              │    CompositionEngine     │
              │                         │
              │  3 → ctx.value = 3       │
              │  s → ctx.value = 30      │
              │  w → execute action      │
              └─────────────────────────┘

Pipeline position: modal → composition-overlay → global-seq-overlay → ...
                       → overlay → composition-screen → global-seq-screen → ...
```

Composition processors sit at positions 1 and 5 in the 9-stage pipeline, above global sequence keys.

## CompositioKey Entry

Each registered key is a `CompositioKey` object:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string` | **required** | Trigger key name (e.g. `"3"`, `"ctrl+s"`). |
| `flag` | `string` | **required** | What type this key declares itself as. Becomes `ctx.lastFlag` after execution. |
| `needs` | `string[]` | **required** | Expected preceding flag(s). When `lastFlag` is null (head key), only `optional` or empty `needs` entries match. |
| `optional` | `boolean` | `false` | When `true`, this key can act as a head key (pressed alone, with no preceding key). |
| `execute` | `(ctx) => ctx \| null` | — | Transform or action function. Receives the accumulated context, returns the new context. Return `null` to abort the chain. |
| `exclusive` | `boolean` | `false` | When `true` mid-sequence and a key doesn't match `needs`, the key is silently consumed (timeout keeps running). When `false`, the key falls through to later processors. |
| `category` | `ComponentType[] \| "*"` | `"*"` | Restrict to specific screens. `[]` = disabled. |
| `affectOverlay` | `boolean` | `false` | `true` = fires in the overlay phase (position 1). `false` = screen phase (position 5). |
| `executeWhenNoOverlay` | `boolean` | `false` | For `affectOverlay: true` entries: also fire when no overlay is open. |
| `timeout` | `number` | `400` | Milliseconds before a partial sequence resets. |

## Resolution Priority

When multiple entries match the same key name, the engine resolves using three tiers:

1. **Needs match** — entries whose `needs` include the current `lastFlag`. For head keys (`lastFlag = null`), only `optional` or empty `needs` entries match.
2. **Modifier specificity** — `"ctrl+s"` beats `"s"` (more modifier segments in the key name).
3. **Needs length** — longer `needs` lists win (stricter contract).

## Signature

```ts
class CompositionEngine<TComponent = unknown> {
  registryCompositionKey(entry: CompositioKey<TComponent>): void
  removeCompositionKey(key: string): boolean
  clearAllCompositionKeys(): void
  hasPending(): boolean
  getContext(): CompositionContext
  abort(): void
  updateCompositionKey(key: string, flag: string, updates: Partial<...>): boolean
}
```

All methods are also available directly on `KeyboardEngine` (delegated internally).

## Key Properties

### CompositionContext

The state object passed through the chain:

| Field | Type | Description |
|-------|------|-------------|
| `value` | `unknown` | Accumulated value from previous `execute` calls. |
| `lastFlag` | `string \| null` | Flag of the most recently executed key. |
| `steps` | `string[]` | Key names that have executed in the current chain. |

## Methods

All methods below are available as `engine.composition.<method>()` or directly as `engine.<method>()`.

### registryCompositionKey

```ts
registryCompositionKey(entry: CompositioKey<TComponent>): void
```

Register a composition key entry. Multiple entries with the same `key` name are stored together — the engine disambiguates them by `needs` / modifier / needs-length at resolution time.

### removeCompositionKey

```ts
removeCompositionKey(key: string): boolean
```

Remove all entries registered under `key`. Returns `true` if found.

### clearAllCompositionKeys

```ts
clearAllCompositionKeys(): void
```

Remove every registered composition key.

### hasPending

```ts
hasPending(): boolean
```

Whether the engine currently has an active pending chain (awaiting the next key in a sequence).

### getContext

```ts
getContext(): CompositionContext
```

Return a shallow copy of the current composition context. Safe to inspect for debugging or UI indicators.

### abort

```ts
abort(): void
```

Cancel the current pending chain immediately (no timeout). Reverts `compositionEngineHandle` on the engine state.

### updateCompositionKey

```ts
updateCompositionKey(
  key: string,
  flag: string,
  updates: Partial<Omit<CompositioKey<TComponent>, "key" | "flag">>
): boolean
```

Update a registered entry identified by `key` + `flag`. Returns `true` if found and updated.

## Best Practice

### Compound number entry (3 → s → w = 30 newlines)

```tsx
import { useKeyboard } from 'ink-cartridge';

function useCompositionActions() {
  const { registryCompositionKey } = useKeyboard();

  useEffect(() => {
    // "3" declares itself as a "times" type, writes value=3 into context
    registryCompositionKey({
      key: '3',
      flag: 'times',
      needs: [],
      execute: (ctx) => ({
        value: 3,
        lastFlag: 'times',
        steps: [...ctx.steps, '3'],
      }),
    });

    // "s" expects "times", multiplies value × 10
    registryCompositionKey({
      key: 's',
      flag: 'action',
      needs: ['times'],
      execute: (ctx) => ({
        value: (ctx.value as number) * 10,
        lastFlag: 'action',
        steps: [...ctx.steps, 's'],
      }),
    });

    // "w" expects "times" or "action", fires the action
    registryCompositionKey({
      key: 'w',
      flag: 'action',
      needs: ['times', 'action'],
      optional: true,
      execute: (ctx) => {
        const times = ctx.value as number ?? 1;
        // ... perform action `times` times
        return { value: times, lastFlag: 'action', steps: [...ctx.steps, 'w'] };
      },
    });
  }, []);
}
```

Pressing `3 w` performs the action 3 times. Pressing `w` alone uses the default of 1. Pressing `3 s w` multiplies 3 → 30 and fires 30 times.

### Exclusive chain (block other keys until match)

```tsx
registryCompositionKey({
  key: 'w',
  flag: 'action',
  needs: ['times'],
  optional: true,
  exclusive: true,
  execute: (ctx) => { /* ... */ },
});
```

When the chain is pending and a mismatched key arrives, it is silently consumed — no other processor sees it. The timeout keeps running.

### Inspect pending state

```tsx
const { hasPendingComposition, getCompositionContext, abortComposition } = useKeyboard();

if (hasPendingComposition()) {
  const ctx = getCompositionContext();
  console.log(`Chain: ${ctx.steps.join(' → ')}, waiting for next key`);
}

// Cancel the chain programmatically
abortComposition();
```

## See Also

- [globalKeys](./globalKeys-API.md) — Global single-key bindings
- [globalSequence](./globalSequence-API.md) — Global multi-key sequences
- [addProcessor](./addProcessor-API.md) — Custom processor injection
- [KeyboardEngine](./KeyboardEngine-API.md) — Framework-agnostic engine
