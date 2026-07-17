# stop

Prevent a key from propagating to lower layers. If a local binding matches, it fires. If none matches, the key is consumed silently — lower layers never see it.

## Signature

```ts
function stop(
  keys: string[],
  options?: StopOptions
): () => void
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `focusId` | `string \| { group: string; focusId: string }` | — | Scope to a focus target. See [Focus System](./focus-system-API.md). |
| `stopAction` | `string` | — | Resolve a shortcut action's bound keys to determine which keys to stop. |
| `when` | `(() => boolean) \| string` | — | Conditional. Accepts a function or a registered condition ID. |

## Returns

`() => void` — call to remove the stop rule.

## Best Practice

Stop `q` at the top-level menu so it never reaches child screens:

```tsx
function Menu() {
  const { stop, boundKeyboard } = useKeyboard();

  useEffect(() => {
    const unstop = stop(['q']);
    const unbind = boundKeyboard(['q'], () => process.exit(0));
    return () => { unstop(); unbind(); };
  }, []);

  return <Text>Press q to quit</Text>;
}
```
