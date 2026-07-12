# currentScreenHasSequenceWaiting

Check whether the current owner's layer has an active pending multi-key sequence (registered via [`boundSequence`](./boundSequence.md)).

Unlike [`thereGlobalQueueWaiting`](./thereGlobalQueueWaiting.md) which checks global sequences, this only checks the layer belonging to the current owner — i.e. the screen or overlay that owns the active keyboard layer. Use this to show sequence-progress hints (like Vim's pending key display).

## Signature

```ts
currentScreenHasSequenceWaiting(sync?: () => void): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `sync` | `() => void` | (Optional) Callback invoked after every `processKey`. Use to trigger re-render for reactive state. |

## Returns

`true` if the current layer has a pending `PendingSequence`, `false` otherwise.

## Effect

When a `sync` callback is provided, it's added to `pendingSyncs` — the same mechanism used by [`thereGlobalQueueWaiting`](./thereGlobalQueueWaiting.md). The callback fires after each [`processKey`](./processKey.md) invocation.

## Usage

```ts
// Show a hint while a local sequence is pending
if (engine.currentScreenHasSequenceWaiting()) {
  // Display partial sequence indicator
}

// Reactive with forced re-render
function useLocalPendingState() {
  const [, forceUpdate] = useState(0);
  return engine.currentScreenHasSequenceWaiting(() => forceUpdate(n => n + 1));
}
```

## Throws

- `[ink-cartridge]` if there is no current owner (no active screen or overlay)

## API interactions

- **[`boundSequence`](./boundSequence.md)** — the producer of local pending sequences
- **[`thereGlobalQueueWaiting`](./thereGlobalQueueWaiting.md)** — same pattern for global sequences; these two APIs share the `pendingSyncs` notification mechanism
- **[`processKey`](./processKey.md)** — `sync` callbacks are notified after every key event
