# Mapping Key

Vim-style key mapping for the composition engine. Register an external key sequence (`keys`) that, when pressed in full, executes an internal composition key chain (`target`) in order.

Similar to vim's `:nnoremap gb tdg` — pressing `g` then `b` runs the composition chain `t → d → g`.

## Signature

```ts
// Access via the composition engine on KeyboardEngine
engine.composition.addMapping(
  base: string[],
  target: string[],
  options?: {
    exclusive?: boolean;
    KeyReleaseWhenChainInterrupted?: boolean;
    when?: (() => boolean) | string;
    affectOverlay?: boolean;
    mode?: string;
    category?: unknown[] | "*";
    executeWhenNoOverlay?: boolean;
  },
): boolean;

engine.composition.removeMappingKey(keys: string[]): boolean;
engine.composition.removeMapping(firstKey: string): boolean;
```

## Parameters

### addMapping

| Param | Type | Description |
|-------|------|-------------|
| `base` | `string[]` | External trigger key sequence (what the user presses). |
| `target` | `string[]` | Internal composition key chain to execute in order. Each element must be a registered composition key. |
| `options` | `object` | Optional fields forwarded to the stored entry. |

### options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `exclusive` | `boolean` | `false` | When `true`, mismatched keys are silently consumed instead of breaking the sequence. |
| `KeyReleaseWhenChainInterrupted` | `boolean` | `false` | When `true` and the target chain is interrupted, the breaking key is swallowed instead of released. |
| `when` | `(() => boolean) \| string` | — | Condition guard. |
| `affectOverlay` | `boolean` | `false` | Which pipeline phase this mapping belongs to. |
| `mode` | `string` | — | Mode filter. |
| `category` | `unknown[] \| "*"` | — | Screen category whitelist. |
| `executeWhenNoOverlay` | `boolean` | — | For `affectOverlay: true`, allow firing when no overlay is active. |

### removeMappingKey

| Param | Type | Description |
|-------|------|-------------|
| `keys` | `string[]` | The exact `base` sequence to remove. |

## Returns

| Method | `true` | `false` |
|--------|--------|---------|
| `addMapping` | Successfully registered. | `base` is empty, a `target` key is not registered, or an identical `base` already exists. |
| `removeMappingKey` | Found and removed. | No mapping with that exact sequence. |

## Behavior

### Single-key mapping (`keys.length === 1`)

Executes the target chain **immediately** on the head key. Does not enter a pending state. When both single-key and multi-key mappings share the same head key, the single-key mapping wins.

### Multi-key mapping (`keys.length > 1`)

1. **Head key pressed** → enters pending state, starts a timeout timer (default 400ms).
2. **Subsequent keys** → narrows candidates by matching `keys[nextIndex]`.
   - Still ambiguous (`> 1` candidate) → advance `nextIndex`, keep waiting.
   - Locked to 1 candidate but more keys expected → advance `nextIndex`, keep waiting.
   - Locked to 1 candidate and sequence complete → run target chain.
   - No candidate matches → sequence broken (see exclusive below).
3. **Timeout** → pending cleared, pressed keys consumed, nothing executes.

### Disambiguation

When multiple mappings share the same head key but diverge later, the engine narrows candidates key-by-key until only one remains. Example:

```
Registered: ['g','b'] → ['t']  and  ['g','d'] → ['s']
User presses: g → pending (2 candidates)
User presses: b → locked to ['g','b'], runs 't'
```

### Exclusive mode

| Scenario | `exclusive: true` | `exclusive: false` (default) |
|----------|-------------------|------------------------------|
| Mismatched key | Silently consumed, sequence keeps waiting | Sequence broken, key released to lower stages |

### Target chain interruption

If any step in the `target` chain fails (composition key not found, `execute` returns `null`, value schema validation fails), the chain stops. The `KeyReleaseWhenChainInterrupted` option controls whether the breaking key is swallowed or released.

### Phase guard (`affectOverlay`)

A mapping started in the overlay phase is not advanced by the screen-phase processor, and vice versa. This mirrors the phase guard on composition pending and global sequences.

### Priority

Mapping keys take **priority over** single-key composition. If a key is both a registered composition head key and a mapping head key, the mapping wins.

## Event subscription

Mapping keys have a separate event system from composition events:

```ts
engine.composition.subscribeMapping(fn: () => void): () => void;
engine.composition.getLastMappingEvent(): MappingKeyEvent | null;
```

```ts
type MappingKeyEvent =
  | { type: "started"; key: string }
  | { type: "continued"; key: string }
  | { type: "completed" }
  | { type: "broken"; key: string }
  | { type: "consumed"; key: string };
```

`subscribe` (composition events) does **not** fire on mapping-key activity, and `subscribeMapping` does not fire on composition activity.

## Examples

### Basic mapping

```ts
// Register composition keys first
engine.registryCompositionKey({ key: 't', flags: [], alternativeFlag: 'times', optional: true, needs: [], execute: ... });
engine.registryCompositionKey({ key: 'd', flags: [], alternativeFlag: 'action', needs: ['times'], execute: ... });

// Map 'g b' → execute 't' then 'd'
engine.composition.addMapping(['g', 'b'], ['t', 'd']);
```

### Single-key mapping

```ts
// Press 'q' → immediately runs 't' then 'd'
engine.composition.addMapping(['q'], ['t', 'd']);
```

### Exclusive mapping

```ts
// Mismatched keys are swallowed, sequence keeps waiting
engine.composition.addMapping(['g', 'b'], ['t'], { exclusive: true });
```

### Remove a mapping

```ts
engine.composition.addMapping(['g', 'b'], ['t']);
engine.composition.removeMappingKey(['g', 'b']);
```

### Subscribe to mapping events

```ts
const unsub = engine.composition.subscribeMapping(() => {
  const evt = engine.composition.getLastMappingEvent();
  console.log('mapping event:', evt);
});

// later
unsub();
```

## Notes

- All `target` keys must be registered composition keys (`registryCompositionKey`) before calling `addMapping`, otherwise `addMapping` returns `false`.
- Mapping keys and composition pending are **mutually exclusive** — only one can be active at a time.
- The mapping subsystem is accessed via `engine.composition` (the `CompositionEngine` instance), not directly on `KeyboardEngine`.
