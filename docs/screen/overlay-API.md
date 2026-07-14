# Overlay System

Floating panels rendered above the current screen. Multiple overlays can be active simultaneously — they receive keyboard events in parallel (broadcast semantics).

## API

### openOverlay

```ts
function openOverlay<C extends React.ComponentType<any>>(
  id: string,
  component: C,
  params: React.ComponentProps<C>,
  options?: OpenOverlayOptions
): void
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `activate` | `boolean` | `true` | Whether the overlay is immediately active (receives keyboard). |
| `zIndex` | `number` | `overlays.length` | Stacking order. |
| `persistent` | `boolean` | `false` | When `true`, the overlay survives screen navigation (skip/back/gotoScreen). Non-persistent overlays are cleared on navigation. Keyboard focus is automatically restored when navigating back to the originating screen and deactivated when navigating away. |

If `id` collides with an existing overlay or modal, this is a no-op — the existing overlay is left unchanged.

### closeOverlay

```ts
function closeOverlay(id: string): void
```

If no overlay with that ID exists, this is a no-op — safe to call even when the overlay may have already been closed.

### closeAllOverlays

```ts
function closeAllOverlays(): void
```

Closes all overlays, including persistent ones.

### activateOverlay / deactivateOverlay

```ts
function activateOverlay(id: string): void
function deactivateOverlay(id: string): void
```

Active overlays receive keyboard events (stage 3 of the pipeline). Inactive overlays are still rendered but don't receive input.

Throws if no overlay with the given ID exists.

## Best Practice

Toggle an overlay on/off with a single key:

```tsx
function Menu() {
  const { openOverlay, closeOverlay } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const openRef = useRef(false);

  useEffect(() => {
    return boundKeyboard(['s'], () => {
      if (openRef.current) {
        closeOverlay('console');
        openRef.current = false;
      } else {
        openOverlay('console', Console, {}, { activate: false });
        openRef.current = true;
      }
    });
  }, []);
}
```
