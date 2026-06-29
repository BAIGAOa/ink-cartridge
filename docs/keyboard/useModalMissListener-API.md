# useModalMissListener

Subscribe to key events that the modal did **not** handle. Only works inside a modal component — silent no-op elsewhere.

## Signature

```ts
function useModalMissListener(
  cb: ModalMissCallback,
  options?: ModalMissOptions
): () => void
```

Where `ModalMissCallback` receives `ModalMissEvent`:
- `{ miss: true, key, input, eventNames }` — key was not handled by the modal
- `{ miss: false }` — key was handled

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `monitorWhen` | `boolean` | `false` | Also fire for keys that would be consumed by a `when` condition returning false. |
| `monitorFocusMismatch` | `boolean` | `false` | Also fire when a focused target exists but the key didn't match its bindings. |

## Returns

`() => void` — call to unsubscribe.

## Best Practice

Flash a visual indicator when the user presses an unrecognized key inside a modal:

```tsx
function MyModal() {
  const [borderColor, setBorderColor] = useState('blue');

  useModalMissListener((e) => {
    if (e.miss) {
      setBorderColor('yellow');
      setTimeout(() => setBorderColor('blue'), 150);
    }
  });

  return <Box borderColor={borderColor}>...</Box>;
}
```
