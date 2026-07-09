# thereGlobalQueueWaiting

Check whether a global multi-key sequence is currently pending. Returns `true` when the first key of a `globalSequence` was matched and the engine is waiting for subsequent keys (or a timeout).

Lightweight yes/no — equivalent to `getGlobalPendingSequence() !== null`.

## Signature

```ts
// Access via useKeyboard() hook
const { thereGlobalQueueWaiting } = useKeyboard();

function thereGlobalQueueWaiting(sync?: () => void): boolean
```

### sync

Optional framework-agnostic callback. When provided, the engine calls it after
every `processKey` that may have changed the pending state, letting the host
framework re-render and read the fresh value.

```tsx
const [, setTick] = useState(0);
const sync = useCallback(() => setTick(t => t + 1), []);

// Re-renders after each key press, so the returned boolean stays current
const waiting = thereGlobalQueueWaiting(sync);
```

When omitted, the method behaves as before — a one-shot read of the current value.

## Returns

`boolean` — `true` when a global sequence is in progress, `false` otherwise.

## Best Practice

Guard actions that shouldn't run while a global sequence is pending:

```tsx
function MyScreen() {
  const { thereGlobalQueueWaiting } = useKeyboard();

  function handleNavigate() {
    // Don't navigate while a global chord is in progress
    if (thereGlobalQueueWaiting()) return;
    // ...navigation logic
  }
}
```

Use `getGlobalPendingSequence()` when you need more detail — remaining keys, timeout, or the handler reference.
