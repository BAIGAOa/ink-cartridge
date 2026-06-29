# blockedKey

Mark a key as **transparent** on the current layer. When pressed, this layer's bindings are skipped — the key falls through to the next layer below.

Despite the name, it means *pass-through*, not "block."

## Signature

```ts
function blockedKey(
  keys: string[],
  options?: BlockedKeyOptions
): () => void
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `focusId` | `string` | — | Only transparent when this focus target is active. |
| `when` | `() => boolean` | — | Conditional. |

## Returns

`() => void` — call to remove the transparency rule.

## Best Practice

Use when a parent needs to claim a key that a child would normally capture:

```tsx
// Child captures 'escape' — parent marks it transparent
useEffect(() => {
  return blockedKey(['escape']);
}, []);
```
