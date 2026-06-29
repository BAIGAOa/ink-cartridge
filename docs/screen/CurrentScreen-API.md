# CurrentScreen

Renders the active screen, then all open overlays, then all rendered modals. This is the single point where screen content appears.

## Signature

```tsx
function CurrentScreen(): React.ReactNode
```

No props. Reads state from `ScreenSystemContext`.

## Rendering Order

1. Current screen element (top of `path`)
2. Overlays — sorted by zIndex ascending, each wrapped in `OverlayContext.Provider`
3. Modals — sorted by zIndex ascending, each wrapped in `ModalContext.Provider`

## Best Practice

Place it inside `KeyboardProvider`, typically alongside null-components like `GlobalKeys`:

```tsx
<KeyboardProvider>
  <GlobalKeys />
  <CurrentScreen />
</KeyboardProvider>
```
