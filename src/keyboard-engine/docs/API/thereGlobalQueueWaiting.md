# thereGlobalQueueWaiting

Check whether a global multi-key sequence is currently pending (i.e. the first key was pressed and the engine is waiting for subsequent keys or a timeout).

This is a "pull" API — it checks the current state on demand. Pass a `sync` callback to enable "push" behavior: the engine will call it after every [`processKey`](./processKey.md) invocation, letting the host framework re-render when the pending state changes.

## Signature

```ts
thereGlobalQueueWaiting(sync?: () => void): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `sync` | `() => void` | (Optional) A callback the engine will call after every `processKey` invocation. The host framework should use this to trigger a re-render so the component re-reads the pending state. |

## Returns

`true` if a global sequence is currently pending, `false` otherwise.

## Effect

When a `sync` callback is provided, it's added to `pendingSyncs` — a set of callbacks notified at the end of `processKey`. The next `processKey` call will invoke all registered syncs after the pipeline completes. This enables reactive re-rendering without polling.

## Usage

```ts
// Polling — check on each render
if (engine.thereGlobalQueueWaiting()) {
  // Show "g _" hint — first key of "g g" was pressed
}

// Reactive — register a sync to force re-render
function useGlobalPendingState() {
  const [, forceUpdate] = useState(0);
  return engine.thereGlobalQueueWaiting(() => forceUpdate(n => n + 1));
}
```

The React adapter (`useKeyboard()` hook) passes a `useState` updater as the `sync` parameter, so the component re-renders automatically when pending state changes.

## API interactions

- **[`globalSequence`](./globalSequence.md)** — the producer of global pending sequences
- **[`currentScreenHasSequenceWaiting`](./currentScreenHasSequenceWaiting.md)** — same pattern but for local (per-layer) sequences
- **[`processKey`](./processKey.md)** — `sync` callbacks are notified after every `processKey` invocation
- **[`getGlobalPendingSequence`](./globalSequence.md)** — read the full pending sequence object (not just a boolean)
