# penetration

Mark a key as **transparent** on the current layer. When pressed, this layer's bindings are skipped — the key falls through to the next layer below.

Formerly named `blockedKey` (the old name was misleading — it means *pass-through*, not "block").

## Signature

```ts
function penetration(
  keys: string[],
  options?: PenetrationOptions
): () => void
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `focusId` | `string` | — | Only transparent when this focus target is active. |
| `when` | `(() => boolean) \| string` | — | Conditional. Accepts a function or a registered condition ID. |

## Returns

`() => void` — call to remove the transparency rule.

## Best Practice

Use when a parent needs to claim a key that a child would normally capture:

```tsx
// Child captures 'escape' — parent marks it transparent
useEffect(() => {
  return penetration(['escape']);
}, []);
```
