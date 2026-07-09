# currentScreenHasSequenceWaiting

Check whether the current screen or overlay layer has a pending multi-key sequence (registered via `boundSequence`). Returns `true` when the first key was matched and the engine is waiting for subsequent keys on the current owner's layer.

Unlike `thereGlobalQueueWaiting`, this only checks the local layer — global sequences are ignored.

## Signature

```ts
// Access via useKeyboard() hook
const { currentScreenHasSequenceWaiting } = useKeyboard();

function currentScreenHasSequenceWaiting(sync?: () => void): boolean
```

### sync

Optional framework-agnostic callback. When provided, the engine calls it after
every `processKey` that may have changed the pending state, letting the host
framework re-render and read the fresh value.

```tsx
const [, setTick] = useState(0);
const sync = useCallback(() => setTick(t => t + 1), []);

// Re-renders after each key press, so the returned boolean stays current
const waiting = currentScreenHasSequenceWaiting(sync);
```

When omitted, the method behaves as before — a one-shot read of the current value.

## Errors

| Condition | Error |
|-----------|-------|
| Called outside a screen or overlay | `[Ink-Cartridge] currentScreenHasSequenceWaiting() must be called inside a screen component or overlay. There is currently no active screen.` |

## Returns

`boolean` — `true` when a `boundSequence` is in progress on the current layer, `false` otherwise.

## Best Practice

Guard navigation while a local chord is mid-flight:

```tsx
function MyScreen() {
  const { currentScreenHasSequenceWaiting } = useKeyboard();

  function tryNavigate() {
    // Don't navigate away while the user is mid-sequence
    if (currentScreenHasSequenceWaiting()) return;
    // ...navigation logic
  }
}
```
