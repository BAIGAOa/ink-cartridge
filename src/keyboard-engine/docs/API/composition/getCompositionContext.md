# getCompositionContext

Return a copy of the current composition context — the chain's accumulated value, last flag, and step history.

## Signature

```ts
// On KeyboardEngine:
getCompositionContext(): CompositionContext

// On CompositionEngine (engine.composition):
getContext(): CompositionContext
```

## Parameters

None.

## Returns

```ts
interface CompositionContext<T = unknown> {
  value: T;           // The value passed through the chain
  lastFlag: string | null;  // Flag of the most recent key, or null at chain start
  steps: string[];    // Trigger key names executed so far
}
```

A **shallow copy** — modifying the returned object does not affect the engine's internal state. The `steps` array is a new array copy. `value` is a reference (not deep-cloned).

## Effect

Pure read. Does not mutate state.

## Usage

```ts
const ctx = engine.getCompositionContext();
// ctx.value    — current accumulated value
// ctx.lastFlag — what type of key was pressed last
// ctx.steps    — which keys have been pressed so far: ['3', '3']

// Use for UI hints
function renderCompositionHint() {
  const ctx = engine.getCompositionContext();
  if (!engine.hasPendingComposition()) return '';
  return `[${ctx.steps.join(' ')} _]`;
}
```

## API interactions

- **[`hasPendingComposition`](./hasPendingComposition.md)** — check if a chain is active before reading context
- **[`abortComposition`](./abortComposition.md)** — clear the context and cancel the chain
- **[`setValueSchema`](./setValueSchema.md)** — when a schema is set, `ctx.value` passes through type guards at each step
