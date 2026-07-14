# openDevTool

Open the development panel as a **persistent** modal — it survives screen navigation so you can inspect state while moving between screens. Keyboard focus is automatically suspended when navigating away and restored on return. **Safe to call when already open** (no-op).

## Signature

```ts
function openDevTool(props: DevProps): void
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `top` | `number` | Vertical position in rows. |
| `left` | `number` | Horizontal position in columns. |
| `zindex` | `number` | Modal zIndex (optional). |
| `allowKeys` | `string[]` | Keys allowed to pass through the modal to layers below (optional). |
| `persistent` | `boolean` | Whether the dev tool survives screen navigation. Defaults to `true`. |

Safe to call when the dev tool is already open — duplicate modal IDs are treated as a no-op.

## Keyboard Controls (inside the panel)

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move panel. |
| `Escape` | Close dev tool. |
| `Ctrl+G` | Open global keys detail sub-panel. |
| `Ctrl+K` | Open layer keys detail sub-panel. |
| `Ctrl+S` | Open global sequences detail sub-panel. |

## Best Practice

Bind to a global key and pass the toggle key through with `allowKeys`:

```tsx
useEffect(() => {
  return boundKeyboard(['ctrl+d'], () => {
    openDevTool({ top: 0, left: 0, allowKeys: ['ctrl+d'] });
  });
}, []);
```

With `allowKeys`, `Ctrl+D` can close the dev tool without needing an external toggle ref — just bind Escape inside the tool and Ctrl+D in global keys.
