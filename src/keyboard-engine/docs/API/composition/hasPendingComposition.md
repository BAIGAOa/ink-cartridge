# hasPendingComposition

Check whether the composition engine currently has an active pending chain.

A chain is "pending" from the moment the first key starts it until either the chain completes naturally, a key is pressed with no matching entry, or the timeout expires.

## Signature

```ts
// On KeyboardEngine:
hasPendingComposition(): boolean

// On CompositionEngine (engine.composition):
hasPending(): boolean
```

## Parameters

None.

## Returns

`true` if a composition chain is actively pending, `false` otherwise.

## Effect

Pure read — returns `this.pendingEntry !== null`. Does not mutate state.

## Usage

```ts
// Show a visual indicator while a composition chain is in progress
if (engine.hasPendingComposition()) {
  const ctx = engine.getCompositionContext();
  // Display: "pending: 3 [waiting for action key]"
}
```

## API interactions

- **[`getCompositionContext`](./getCompositionContext.md)** — read the current chain state (value, lastFlag, steps)
- **[`abortComposition`](./abortComposition.md)** — cancel the pending chain
- **[`registryCompositionKey`](./registryCompositionKey.md)** — registered entries determine whether a chain starts or continues
