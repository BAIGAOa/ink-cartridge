# useEmitter

Create a stable function pre-bound to a specific event. The returned function never changes identity across re-renders, so it's safe to omit from dependency arrays and pass directly as a callback.

## Signature

```ts
function useEmitter<K extends string>(event: K): (payload: any) => void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `event` | `string` | The event name to emit. |

## Returns

`(payload: any) => void` — a stable function. Call it to emit the event with a payload.

## Best Practice

Call once per event, then pass the emitter directly to `globalKeys`:

```tsx
function GlobalKeys() {
  const emitSave = useEmitter('SAVE');
  const emitQuit = useEmitter('QUIT');
  const { globalKeys } = useKeyboard();

  useEffect(() => {
    globalKeys([
      { key: ['ctrl+s'], operate: emitSave, category: '*' },
      { key: ['ctrl+q'], operate: emitQuit, category: '*', times: 2 },
    ]);
  }, []);

  return null;
}
```

For ad-hoc emits (not passed as a callback), call inline:

```tsx
const emit = useEmitter('NOTIFY');
emit({ text: 'done' });
```
