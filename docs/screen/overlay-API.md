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
| `activate` | `boolean` | `false` | Whether the overlay is immediately active (receives keyboard). |
| `zIndex` | `number` | `overlays.length` | Stacking order. |

Throws if `id` collides with an existing overlay or modal.

### closeOverlay

```ts
function closeOverlay(id: string): void
```

Throws if no overlay with that ID exists.

### closeAllOverlays

```ts
function closeAllOverlays(): void
```

### activateOverlay / deactivateOverlay

```ts
function activateOverlay(id: string): void
function deactivateOverlay(id: string): void
```

Active overlays receive keyboard events (stage 3 of the pipeline). Inactive overlays are still rendered but don't receive input.

## Best Practice

Toggle an overlay on/off with a single key:

```tsx
function Menu() {
  const { openOverlay, closeOverlay } = useScreenSystem();
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
