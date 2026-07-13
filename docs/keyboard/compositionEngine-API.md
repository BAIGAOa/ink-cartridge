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

## Value Schema (Runtime Type Validation)

By default the composition context's `value` property is `unknown` — every `execute` callback must cast it to the expected type. You can opt into runtime validation by providing a `ValueSchema`:

```ts
type ValueGuard = (value: unknown) => boolean;
type ValueSchema = Record<string, ValueGuard>;
```

A `ValueGuard` returns `true` when the value matches the expected shape for a given flag. The engine validates:

- **Input** — before calling a chain key's `execute`, checks that `ctx.value` passes the guard for `ctx.lastFlag`.
- **Output** — after `execute` returns, checks that `result.value` passes the guard for the current key's `flag`.

When a guard fails, the engine clears the pending chain, emits a `console.warn` (development only), and the key falls through to later processors.

### Providing a schema

Pass `valueSchema` when constructing `KeyboardEngine`:

```ts
const engine = new KeyboardEngine({
  normalizeKeyNames,
  valueSchema: {
    times: (v): v is number => typeof v === 'number',
    action: (v): v is number => typeof v === 'number',
  },
});
```

Or set it later via the composition engine:

```ts
engine.composition.setValueSchema({
  times: (v): v is number => typeof v === 'number',
  action: (v): v is number => typeof v === 'number',
});
```

Guards are optional per-flag — flags without a registered guard pass through silently. The schema can be `undefined` (the default), in which case no validation occurs (backward compatible).

## CompositioKey Entry

Each registered key is a `CompositioKey` object:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string` | **required** | Trigger key name (e.g. `"3"`, `"ctrl+s"`). |
| `flags` | `{ need: string, become: string }[]` | `[]` | Dependency-based flag table. When the preceding key's flag matches `need`, this key becomes `become`. If no match, falls back to `alternativeFlag`. |
| `alternativeFlag` | `string` | **required** | Default flag when no `flags` entry matches. Also used as the head-key flag in auto-propagation mode. |
| `needs` | `string[]` | **required** | Expected preceding flag(s). The engine checks these literally against `ctx.lastFlag`. |
| `optional` | `boolean` | `false` | When `true`, this key can act as a head key (pressed alone, with no preceding key). |
| `execute` | `(ctx) => ctx \| null` | — | Transform or action function. Receives the accumulated context, returns the new context. Return `null` to abort the chain. |
| `exclusive` | `boolean` | `false` | When `true` mid-sequence and a key doesn't match `needs`, the key is silently consumed (timeout keeps running). When `false`, the key falls through to later processors. |
| `category` | `ComponentType[] \| "*"` | `"*"` | Restrict to specific screens. `[]` = disabled. |
| `affectOverlay` | `boolean` | `false` | `true` = fires in the overlay phase (position 1). `false` = screen phase (position 5). |
| `executeWhenNoOverlay` | `boolean` | `false` | For `affectOverlay: true` entries: also fire when no overlay is open. |
| `timeout` | `number` | `400` | Milliseconds before a partial sequence resets. |
| `undoAction` | `(ctx) => ctx \| null` | `(ctx) => ctx` | Reverse action for this key. Called during `undo()` in reverse order. Receives the context as it was AFTER this key executed. Return `null` to stop the undo chain. Defaults to identity pass-through. |
| `KeyReleaseWhenChainInterrupted` | `boolean` | — | When `execute` returns `null` or guard validation fails, swallow the key instead of letting it fall through. |

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
  undo(steps?: number, options?: { isolated?: boolean }): CompositionContext | null
  bufferedCount(): number
  clearBuffers(): void
  setValueSchema(schema: ValueSchema): void
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

Cancel the current pending chain immediately (no timeout). Also records the chain's history before clearing — aborted sequences can still be undone.

### undo

```ts
undo(steps?: number): CompositionContext | null
```

Undo one or more completed composition sequences. Each completed chain (timeout-fired) is stored in the undo buffer as a separate entry.

- **`steps`** — number of past sequences to undo, defaults to `1`.
- **Returns** the final context after all undo actions, or `null` if no sequences are buffered.
- **Throws** if `steps` exceeds the buffer depth.

Undo iterates sequences in reverse chronological order (most recent first), and within each sequence iterates keys in reverse order (last key first). Each key's `undoAction` receives the context that the key produced, and its return value is passed to the previous key's `undoAction`.

If any `undoAction` returns `null`, the undo chain stops early — subsequent keys are not undone. The intermediate context is preserved and returned.

When a `valueSchema` is configured, undo validates input and output the same way `execute` does:

- **Input** — `currentCtx.value` must pass the guard for `currentCtx.lastFlag`.
- **Output** — the value returned by `undoAction` must pass the guard for the new context's `lastFlag`.

### setValueSchema

```ts
setValueSchema(schema: ValueSchema): void
```

Set or replace the runtime type guard schema used to validate `execute` and `undo` values. See [Value Schema](#value-schema-runtime-type-validation).

### bufferedCount

```ts
bufferedCount(): number
```

Number of completed sequences in the undo buffer. Use this to show an undo indicator (e.g. "4 actions to undo").

### clearBuffers

```ts
clearBuffers(): void
```

Remove all buffered undo history. Call this when the document state changes in a way that makes past undos irrelevant (e.g. file reload).

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

### Compound number entry with runtime validation

```tsx
import { useKeyboard } from 'ink-cartridge';

function useCompositionActions() {
  const { registryCompositionKey } = useKeyboard();

  useEffect(() => {
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

    registryCompositionKey({
      key: 's',
      flag: 'action',
      needs: ['times'],
      execute: (ctx) => {
        const v = ctx.value as number;
        return { value: v * 10, lastFlag: 'action', steps: [...ctx.steps, 's'] };
      },
    });

    registryCompositionKey({
      key: 'w',
      flag: 'action',
      needs: ['times', 'action'],
      optional: true,
      execute: (ctx) => {
        const times = (ctx.value as number) ?? 1;
        return { value: times, lastFlag: 'action', steps: [...ctx.steps, 'w'] };
      },
    });
  }, []);
}
```

When a `valueSchema` is configured on the engine (see [Value Schema](#value-schema-runtime-type-validation)), the `as number` casts become runtime-verified — a mismatched value type clears the chain immediately instead of silently producing `NaN`.

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

### Undo a completed sequence

```tsx
registryCompositionKey({
  key: '3',
  flags: [],
  alternativeFlag: 'times',
  needs: [],
  execute: (ctx) => ({ value: 3, lastFlag: 'times', steps: [...ctx.steps, '3'] }),
  undoAction: (ctx) => ({ value: undefined, lastFlag: null, steps: [] }),
});
```

### Multi-flag key (dependent flags)

A key can declare multiple potential flags depending on what preceded it:

```tsx
registryCompositionKey({
  key: 's',
  flags: [
    { need: 'times', become: 'scalar' },    // preceded by number → become scalar
    { need: 'word', become: 'delete' },       // preceded by word → become delete
  ],
  alternativeFlag: 'unknown',                 // fallback if no match
  needs: ['times', 'word'],
  execute: (ctx) => ({
    value: (ctx.value as number) * 10,
    lastFlag: null,  // null → engine auto-picks from flags table
    steps: [...ctx.steps, 's'],
  }),
});
```

When `execute` returns `lastFlag: null`, the engine auto-propagates:
- **Head key** → uses `alternativeFlag`
- **Chain key** → calls `chooseFlag(currentLastFlag, flags)`, falls back to `alternativeFlag`
- **User explicitly sets lastFlag** → engine respects it (no auto-propagation)

### Undo a completed sequence

Each key declares its own `undoAction` — the reverse of `execute`:

```tsx
registryCompositionKey({
  key: '3',
  flag: 'times',
  needs: [],
  execute: (ctx) => ({ value: 3, lastFlag: 'times', steps: [...ctx.steps, '3'] }),
  undoAction: (ctx) => ({ value: undefined, lastFlag: null, steps: [] }),
});

registryCompositionKey({
  key: 's',
  flag: 'action',
  needs: ['times'],
  execute: (ctx) => ({
    value: (ctx.value as number) * 10,
    lastFlag: 'action',
    steps: [...ctx.steps, 's'],
  }),
  undoAction: (ctx) => ({
    value: (ctx.value as number) / 10,
    lastFlag: 'times',
    steps: ctx.steps.slice(0, -1),
  }),
});
```

After a chain completes (timeout fires), undo is available:

```tsx
// Undo the last completed sequence
const { undoComposition } = useKeyboard();
const ctx = undoComposition();    // undo most recent chain
// ctx.value === restored state

// Undo multiple sequences at once
const ctx = undoComposition(3);   // undo last 3 chains
```

## See Also

- [globalKeys](./globalKeys-API.md) — Global single-key bindings
- [globalSequence](./globalSequence-API.md) — Global multi-key sequences
- [addProcessor](./addProcessor-API.md) — Custom processor injection
- [KeyboardEngine](./KeyboardEngine-API.md) — Framework-agnostic engine
