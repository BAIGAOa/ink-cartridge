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

If `layerId` is already registered as a modal layer, the call is a **no-op** — state is unchanged and a `[ink-cartridge]` warning is printed in development. This protects against rapid repeated opens (e.g. a key binding that re-fires while the modal layer is still open). An ID already used by a normal *layer* still throws: modal layers and layers share one ID namespace, so a cross-namespace collision is a real bug.

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

Applying an `elementId` that is already applied on the target modal layer is a no-op with a development warning (same rapid-reopen protection as `openModalLayer`). Applying to a modal layer that is not registered still throws.

### closeModalLayer / eraseElementInModalLayer / closeAllModalLayer

```ts
function closeModalLayer(targetModalLayerId: string): void
function eraseElementInModalLayer(targetModalLayerId: string, targetElementId: string): void
function closeAllModalLayer(): void
```

`closeModalLayer` on a modal layer that is not registered and `eraseElementInModalLayer` on an element ID that is not applied are no-ops with development warnings — duplicate closes/erases from rapid key presses are ignored. `eraseElementInModalLayer` on an unregistered modal layer still throws.

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
