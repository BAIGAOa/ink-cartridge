# allowModal

Let specific keys pass through the modal barrier. By default, a modal layer consumes every key event — nothing reaches screens or layers below. This creates exceptions.

## Signature

```ts
function allowModal(
  keys: string[],
  options?: AllowModalOptions
): () => void
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `focusId` | `string \| { group: string; focusId: string }` | — | Only allow pass-through when this focus target is the active one for its group. See [Focus System](./focus-system-API.md). |
| `when` | `(() => boolean) \| string` | — | Conditional. Accepts a function or a registered condition ID. |

## Returns

`() => void` — call to remove the allow rule.

## Best Practice

Let a toggle key pass through the modal so it can be dismissed from outside:

```tsx
function SettingsModal() {
  const { allowModal } = useKeyboard();

  useEffect(() => {
    return allowModal(['escape']);
  }, []);

  return <Text>Settings</Text>;
}
```
