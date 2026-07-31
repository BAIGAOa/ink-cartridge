# Layer System

Floating panels rendered above the current screen. A layer can contain multiple elements; all active elements in a layer receive keyboard events (broadcast semantics). Multiple layers stack by `zIndex`, and the top layer consumes a key before lower layers.

## API

### openLayer

```ts
function openLayer(layerId: string, zIndex: number, options?: LayerOptions): void
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `crossPage` | `boolean` | `false` | When `true`, the layer survives screen navigation (skip/back/gotoScreen). Non-`crossPage` layers are cleared on navigation. |

If `layerId` collides with an existing layer or modal layer, the reducer leaves state unchanged.

### applyElement

```ts
function applyElement(targetLayerId: string, layerElement: LayerElement): void
```

`LayerElement` shape:

```ts
type LayerElement = {
  elementId: string;
  element: React.ComponentType;
  active?: boolean;
};
```

`active` defaults to `true`. Deactivated elements stay mounted but are removed from keyboard dispatch.

### closeLayer / eraseElement / closeAllLayer

```ts
function closeLayer(targetLayerId: string): void
function eraseElement(targetLayerId: string, targetElementId: string): void
function closeAllLayer(): void
```

### activateElement / deactivateElement

```ts
function activateElement(targetLayerId: string, targetElementId: string): void
function deactivateElement(targetLayerId: string, targetElementId: string): void
```

Active layer elements receive keyboard events. Inactive elements remain rendered but do not receive input.

## Best Practice

Toggle a layer on/off with a single key:

```tsx
function Menu() {
  const { openLayer, applyElement, closeLayer } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const openRef = useRef(false);

  useEffect(() => {
    return boundKeyboard(['s'], () => {
      if (openRef.current) {
        closeLayer('console');
        openRef.current = false;
      } else {
        openLayer('console', 10);
        applyElement('console', {
          elementId: 'console-element',
          element: ConsolePanel,
        });
        openRef.current = true;
      }
    });
  }, []);
}
```
