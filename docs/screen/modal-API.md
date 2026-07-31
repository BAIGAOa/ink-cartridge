# Modal Layer System

Modal layers block all keyboard input to screens and normal layers. Only one modal layer is active at a time — the one with the highest `zIndex`.

## API

### openModalLayer

```ts
function openModalLayer(
  layerId: string,
  zIndex: number,
  options?: ModalLayerOptions,
): void
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `crossPage` | `boolean` | `false` | When `true`, the modal layer survives screen navigation (skip/back/gotoScreen). Non-`crossPage` modal layers are cleared on navigation. |

If `layerId` collides with an existing layer or modal layer, the reducer leaves state unchanged.

### applyElementToModalLayer

```ts
function applyElementToModalLayer(
  targetModalLayerId: string,
  modalLayerElement: LayerElement,
): void
```

`LayerElement` uses the same shape as normal layers:

```ts
type LayerElement = {
  elementId: string;
  element: React.ComponentType;
  active?: boolean;
};
```

### closeModalLayer / eraseElementInModalLayer / closeAllModalLayer

```ts
function closeModalLayer(targetModalLayerId: string): void
function eraseElementInModalLayer(targetModalLayerId: string, targetElementId: string): void
function closeAllModalLayer(): void
```

### activateElementInModalLayer / deactivateElementInModalLayer

```ts
function activateElementInModalLayer(
  targetModalLayerId: string,
  targetElementId: string,
): void
function deactivateElementInModalLayer(
  targetModalLayerId: string,
  targetElementId: string,
): void
```

## Modal Layer vs Normal Layer

| | Normal layer | Modal layer |
|---|---|---|
| Keyboard | Broadcast to all active elements | Exclusive — only the active modal layer receives input |
| Activation | Multiple elements can be active | Single active layer (highest zIndex) |
| Context | `LayerElementContext` | `ModalLayerElementContext` |
| ID namespace | Shared with modal layers | Shared with normal layers |

## Best Practice

```tsx
function Menu() {
  const { openModalLayer, applyElementToModalLayer } = useScreenSystem();
  const { boundSequence } = useKeyboard();

  useEffect(() => {
    return boundSequence(['d', 'c'], () => {
      openModalLayer('console', 100);
      applyElementToModalLayer('console', {
        elementId: 'console-modal',
        element: ConsoleModal,
      });
    });
  }, []);
}
```
