# ModalLayerElementContext

React context that provides the current modal-layer element's ID and its parent `ModalLayer`. Consumed by `useKeyboard` internally to isolate keyboard layers per modal-layer element — enabling multiple instances of the same component in different modal layers.

## Signature

```ts
const ModalLayerElementContext = createContext<{
  id: string;
  modalLayer: ModalLayer;
} | null>(null)
```

## Usage

Read it when you need the element ID or modal-layer ID for programmatic control:

```tsx
function ConsoleModal() {
  const modalCtx = useContext(ModalLayerElementContext);
  const { closeModalLayer } = useScreenSystem();

  useEffect(() => {
    return boundSequence(['c', 'c'], () => {
      if (modalCtx) closeModalLayer(modalCtx.modalLayer.layerId);
    });
  }, [modalCtx]);
}
```

In most cases you will NOT need to read this directly — `useKeyboard` reads it automatically and scopes bindings, `allowModal`, focus methods, and miss listeners to the current modal-layer element.
