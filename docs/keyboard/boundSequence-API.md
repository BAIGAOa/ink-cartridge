# boundSequence

Register a multi-key sequence on the current layer (minimum 2 keys). The handler fires only after all keys are pressed in order within the timeout window.

## Signature

```ts
// Explicit keys
function boundSequence(
  keys: string | string[],
  handler: () => void,
  options?: SequenceOptions
): () => void

// Via registered sequence action
function boundSequence(
  actionId: string,
  options?: SequenceOptions
): () => void
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | `500` | Milliseconds before a partial sequence resets. |
| `exclusive` | `boolean` | `false` | `true` = mismatched key is silently consumed. `false` = mismatch cancels the sequence and the key falls through. |
| `focusId` | `string` | — | Scope to a focus target. |
| `when` | `() => boolean` | — | Conditional. |

## Returns

`() => void` — call to unbind the sequence.

## Best Practice

For chord-like shortcuts that shouldn't collide with single-key bindings:

```tsx
useEffect(() => {
  const u1 = boundSequence(['d', 'd'], onCancel);
  const u2 = boundSequence(['c', 'c'], onConfirm);
  return () => { u1(); u2(); };
}, []);
```
