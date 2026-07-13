# CompositionEngine

Build multi-key compound actions — "flag → needs → execute" chains — where each key press passes a value to the next step.

Think of it as a state machine triggered by key presses: pressing key "A" sets `lastFlag: "A"` and produces a value. The next key "B" (with `needs: ["A"]`) receives that value via `execute(ctx)`, transforms it, and passes it forward. The chain continues until the user stops pressing matching keys or the timeout expires.

## Concepts

### CompositioKey

Each registered key is a node in the chain:

```ts
interface CompositioKey<TComponet = unknown, TValue = unknown> {
  key: string;              // Trigger key name
  alternativeFlag: string;    // Default flag. Also becomes head-key flag via auto-propagation.
  flags: { need: string; become: string }[]; // Dependent flag table — chooseFlag picks based on precedent
  needs: string[];          // Which flags must precede this key
  optional?: boolean;       // Can start a chain without a preceding flag
  execute?: (ctx: CompositionContext<TValue>) => CompositionContext<TValue> | null;
  timeout?: number;         // Per-key timeout override (default: engine's defaultTimeout)
  exclusive?: boolean;      // Silently consume mismatched keys while pending
  affectOverlay?: boolean;  // Fire in the overlay phase or screen phase
  when?: (() => boolean) | string;
  mode?: string;
  category?: TComponet[] | "*";
  executeWhenNoOverlay?: boolean;
  KeyReleaseWhenChainInterrupted?: boolean;  // Swallow key when chain breaks
}
```

### Value flow

```
Key A pressed (flag: "times", needs: [])
  → ctx.value = execute({ value: undefined, lastFlag: null }) → { value: 5, lastFlag: "times" }

Key 3 pressed (flag: "action", needs: ["times"])
  → execute({ value: 5, lastFlag: "times" }) → { value: 15, lastFlag: "action" }
  → Handler fires with { value: 15 }
```

## Pipeline placement

Composition sits at two pipeline stages:
- **Stage 1** — `affectOverlay: true` entries (fire before overlays)
- **Stage 5** — `affectOverlay: false` entries (fire after overlays, before screens)

Entry resolution uses `needs` matching: when a pending chain exists, only keys whose `needs` include `lastFlag` are eligible. When no chain is pending, only keys with `optional: true` or empty `needs` can start a chain.

## Access

The `CompositionEngine` instance is accessible as `engine.composition`. The `KeyboardEngine` also exposes convenience delegates:
- `engine.registryCompositionKey(entry)` → `engine.composition.registryCompositionKey(entry)`
- `engine.removeCompositionKey(key)` → `engine.composition.removeCompositionKey(key)`
- ... (all composition methods are available on both)

## API index

| API | Purpose |
|-----|---------|
| [registryCompositionKey](./registryCompositionKey.md) | Register a chain key |
| [removeCompositionKey](./removeCompositionKey.md) | Remove keys by trigger name |
| [hasPendingComposition](./hasPendingComposition.md) | Check if a chain is active |
| [getCompositionContext](./getCompositionContext.md) | Read current chain state |
| [abortComposition](./abortComposition.md) | Cancel the active chain |
| [setValueSchema](./setValueSchema.md) | Runtime type validation for chain values |
| [updateCompositionKey](./updateCompositionKey.md) | Modify a registered entry at runtime |
