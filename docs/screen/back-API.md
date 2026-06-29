# back

Navigate up the screen stack toward the root.

## Signature

```ts
function back(levels?: number): void
```

## Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `levels` | `number` | `1` | How many levels to go up. |

## Behavior

- Throws if at the root screen (can't go further up).
- Clears all overlays and modals.

## Best Practice

Bind Escape to `back()` for hierarchical back navigation:

```tsx
function Settings() {
  const { back } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    return boundKeyboard(['escape'], () => back());
  }, []);

  return <Text>Settings — press Escape to go back</Text>;
}
```
