# boundKeyboard

Bind a key (or keys) to a handler on the current layer. Returns an unbind function.

## Signature

```ts
// Explicit keys
function boundKeyboard(
  keys: string | string[],
  handler: KeyHandler | string,
  options?: BoundKeyboardOptions
): () => void

// Via registered shortcut action
function boundKeyboard(
  actionId: string,
  options?: BoundKeyboardOptions
): () => void
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `focusId` | `string` | — | Scope binding to a focus target. Key only fires when this target is active. |
| `onlyThis` | `boolean` | `false` | Only fire when this layer is the sole active overlay (or no overlays are active). |
| `once` | `boolean` | `false` | Auto-unbind after first invocation. |
| `times` | `number` | — | Fire on every Nth press (e.g. `2` = 2nd, 4th, 6th…). |
| `observer` | `(count: number) => void` | — | Called on each press with the running count. Only meaningful with `times`. |
| `when` | `(() => boolean) \| string` | — | Conditional: only fire when this returns `true`. Accepts a function or a registered condition ID. |
| `mode` | `string` | — | Restrict to a specific mode. Binding is skipped when the active mode doesn't match. See [Mode System](./mode-system-API.md). |

## Returns

`() => void` — call to unbind. Always call this in the effect cleanup.

## Best Practice

Register in `useEffect`, unbind in the cleanup. For handlers that reference changing state, use a ref to avoid stale closures:

```tsx
function Editor() {
  const { boundKeyboard } = useKeyboard();
  const [content, setContent] = useState('');

  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    const unbind = boundKeyboard(['ctrl+s'], () => {
      saveToDisk(contentRef.current);
    });
    return unbind;
  }, []);

  return <Text>{content}</Text>;
}
```

When the key should only work while a specific input is focused, pass `focusId`:

```tsx
boundKeyboard(['escape'], handleClear, { focusId: 'search-field' });
```
