# openDevTool

Open the development panel as a modal. Shows screen path, overlays, modals, focus targets, and per-layer keyboard bindings in real time.

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

Throws if the dev tool is already open.

## Keyboard Controls (inside the panel)

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move panel. |
| `Escape` | Close dev tool. |
| `Ctrl+G` | Open global keys detail sub-panel. |
| `Ctrl+K` | Open layer keys detail sub-panel. |
| `Ctrl+S` | Open global sequences detail sub-panel. |

## Best Practice

Bind to a global key and guard with try/catch:

```tsx
useEffect(() => {
  return boundKeyboard(['ctrl+d'], () => {
    try { openDevTool({ top: 0, left: 0 }); } catch {}
  });
}, []);
```
