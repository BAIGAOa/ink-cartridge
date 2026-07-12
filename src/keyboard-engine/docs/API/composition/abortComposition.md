# abortComposition

Cancel the current composition chain immediately, without waiting for the timeout.

Clears the pending entry timer, resets the composition context to its initial state (`value: undefined`, `lastFlag: null`, `steps: []`), and sets the engine's `compositionEngineHandle` flag to `false`.

## Signature

```ts
// On KeyboardEngine:
abortComposition(): void

// On CompositionEngine (engine.composition):
abort(): void
```

## Parameters

None.

## Returns

Nothing (`void`).

## Effect

- Clears the pending timer via `clearTimeout` — no stale timeout callback will fire
- Sets `pendingEntry` to `null`
- Resets `context` to `{ value: undefined, lastFlag: null, steps: [] }`
- Sets `compositionEngineHandle` to `false` (tells the pipeline the engine has no active chain)

If no chain is pending, calling `abortComposition` is a no-op.

## Usage

```ts
// Cancel on a specific key
engine.boundKeyboard('escape', () => {
  engine.abortComposition();
});

// Cancel on mode switch
function switchMode(mode: string) {
  engine.abortComposition();
  engine.setMode(mode);
}

// Cancel all composition state
engine.abortComposition();
engine.clearAllCompositionKeys();
```

## API interactions

- **[`removeCompositionKey`](./removeCompositionKey.md)** — removing entries does NOT cancel an active chain; call `abortComposition` first if needed
- **[`hasPendingComposition`](./hasPendingComposition.md)** — after abort, returns `false`
- **[`getCompositionContext`](./getCompositionContext.md)** — after abort, returns the initial empty context
- **[`processKey`](../processKey.md)** — the composition processor checks `compositionEngineHandle` to decide whether to process pending chains
