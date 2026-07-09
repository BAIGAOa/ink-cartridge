# thereGlobalQueueWaiting

Check whether a global multi-key sequence is currently pending. Returns `true` when the first key of a `globalSequence` was matched and the engine is waiting for subsequent keys (or a timeout).

Lightweight yes/no — equivalent to `getGlobalPendingSequence() !== null`.

## Signature

```ts
// Access via useKeyboard() hook
const { thereGlobalQueueWaiting } = useKeyboard();

function thereGlobalQueueWaiting(): boolean
```

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
