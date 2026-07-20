# Mapping Key

Vim-style key mapping for the composition engine. Maps an external key sequence to an internal composition key chain.

## Signature

```ts
addMapping(
  base: string[],
  target: string[],
  options?: Omit<MappingKeyEntry<TComponent>, "keys" | "target">,
): boolean

removeMappingKey(keys: string[]): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `base` | `string[]` | External trigger key sequence. |
| `target` | `string[]` | Internal composition key chain (each element must be a registered composition key). |
| `options` | `object` | Optional: `exclusive`, `KeyReleaseWhenChainInterrupted`, `when`, `affectOverlay`, `mode`, `category`, `executeWhenNoOverlay`. |

## Returns

`addMapping`: `true` on success, `false` if `base` is empty, any `target` key is not registered, or an identical `base` already exists.

`removeMappingKey`: `true` if found and removed, `false` otherwise.

## Effect

`addMapping` stores a `MappingKeyEntry` in `this.mapping` (a `Map<string, Set<MappingKeyEntry>>`), keyed by `base[0]`. When a key event matches `base[0]`, `tryStartMappingKeyPending` is called (via `startPending`), which either:

- Executes the target chain immediately (single-key mapping, `base.length === 1`), or
- Creates a `MappingPendingEntry` and waits for subsequent keys (multi-key mapping).

`removeMappingKey` removes the entry with the exact matching `base` sequence from the set.

## Behavior

### Startup (`tryStartMappingKeyPending`)

1. Find `keyOfDestiny` — the first registered mapping head key in `currentKey` (eventNames).
2. `filterEntries` by `affectOverlay` / `mode` / `category`.
3. **Single-key mappings** (`keys.length === 1`): run `runTargetChain` immediately.
4. **Multi-key mappings**: create `MappingPendingEntry` with:
   - `nextIndex = 1` (head key already matched)
   - `exclusive` from `filtered[0].exclusive ?? false`
   - `candidates`: exclusive → `[selected]`; non-exclusive → non-exclusive entries only
   - `affectOverlay` from the current phase

### Advancement (`processMappingKeyPending`)

Called on every key event while `mappingPendingEntry` is set. Phase guard: `affectOverlay` must match.

For each name in `currentKey`, check if any candidate's `keys[nextIndex]` matches:

- **No match**: exclusive → swallow and keep waiting; otherwise → clear pending, release key.
- **Match, still ambiguous** (`> 1`): advance `nextIndex++`, keep waiting.
- **Match, locked but incomplete** (`keys.length > nextIndex + 1`): advance `nextIndex++`, keep waiting.
- **Match, locked and complete** (`keys.length === nextIndex + 1`): run `runTargetChain`.

### Target chain (`runTargetChain`)

Walks `entry.target` in order, resolving each against `keyMappingTable`:

1. First target: `resolveCompositionKey(entries, null)` (head of chain).
2. Subsequent targets: `resolveCompositionKey(entries, currentCtx.lastFlag)`.
3. Each step: `checkResult` runs `execute` and validates output.
4. Any failure → chain interrupted, returns `{ ok: false, swallow: entry.KeyReleaseWhenChainInterrupted ?? false }`.

## Usage

```ts
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';

const engine = new KeyboardEngine({
  normalizeKeyNames: (input, _key) => input ? [input] : [],
});

// Register composition keys
engine.registryCompositionKey({
  key: 't', flags: [], alternativeFlag: 'times',
  optional: true, needs: [],
  execute: (ctx) => ({ ...ctx, lastFlag: 'times', steps: [...ctx.steps, 't'] }),
});
engine.registryCompositionKey({
  key: 'd', flags: [], alternativeFlag: 'action',
  needs: ['times'],
  execute: (ctx) => ({ ...ctx, lastFlag: 'action', steps: [...ctx.steps, 'd'] }),
});

// Map 'g b' → 't d'
engine.composition.addMapping(['g', 'b'], ['t', 'd']);

// Single-key mapping
engine.composition.addMapping(['q'], ['t']);

// Exclusive
engine.composition.addMapping(['g', 'd'], ['t'], { exclusive: true });

// Remove
engine.composition.removeMappingKey(['g', 'b']);
```

## Event subscription

Mapping keys have a separate event system:

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

These events are isolated from `CompositionEvent` — `subscribe` does not fire on mapping activity, and `subscribeMapping` does not fire on composition activity.

## API interactions

- **[`registryCompositionKey`](./composition.md)** — all `target` keys must be registered before `addMapping`.
- **[`processPending`](./processKey.md)** — mapping-key pending is checked inside `processPending` before composition pending, ensuring mapping keys take priority.
- **[`startPending`](./processKey.md)** — `tryStartMappingKeyPending` is called inside `startPending` before single-key composition startup.
- **[`clearPending`](./composition.md)** — `clearMappingPending` mirrors `clearPending`; both reset `compositionEngineHandle`. Mapping and composition pending are mutually exclusive.
- **[`kickProcessor`](./kickProcessor.md)** — kicking `composition-overlay` or `composition-screen` prevents the composition processor from running, which blocks mapping-key startup.
