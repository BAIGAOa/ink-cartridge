# allowModal

Let specific keys pass through the modal barrier. By default, a modal consumes every key event — nothing reaches screens or overlays below. This creates exceptions.

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
| `focusId` | `string` | — | Only allow pass-through when this focus target is active. |

## Returns

`() => void` — call to remove the allow rule.

## Best Practice

Let the dev-tool toggle key pass through the modal so it can be closed from outside:

```tsx
function DevModal() {
  const { allowModal } = useKeyboard();

  useEffect(() => {
    return allowModal(['ctrl+d']);
  }, []);

  return <Text>Dev Panel</Text>;
}
```
