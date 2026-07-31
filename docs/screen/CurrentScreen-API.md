# CurrentScreen

Renders the active screen, then all open layers, then all open modal layers. This is the single point where screen content appears.

## Signature

```tsx
function CurrentScreen(): React.ReactNode
```

No props. Reads state from `ScreenSystemContext`.

## Rendering Order

1. Current screen element (top of `pagePath`)
2. Layers — sorted by zIndex ascending, each element wrapped in `LayerElementContext.Provider`
3. Modal layers — sorted by zIndex ascending, each element wrapped in `ModalLayerElementContext.Provider`

## Best Practice

Place it inside `KeyboardProvider`, typically alongside null-components like `GlobalKeys`:

```tsx
<KeyboardProvider>
  <GlobalKeys />
  <CurrentScreen />
</KeyboardProvider>
```
