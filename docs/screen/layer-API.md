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

If `layerId` is already registered as a layer, the call is a **no-op** — state is unchanged and a `[ink-cartridge]` warning is printed in development. This protects against rapid repeated opens (e.g. a key binding that re-fires while the layer is still open). An ID already used by a *modal layer* still throws: layers and modal layers share one ID namespace, so a cross-namespace collision is a real bug.

### applyElement

```ts
function applyElement<C extends React.ComponentType>(targetLayerId: string, layerElement: LayerElementInput<C>): void
```

`LayerElementInput<C>` shape:

```ts
type LayerElementInput<C> = {
  elementId: string;
  element: C;
  active?: boolean;
  props?: React.ComponentProps<C>;  // type-checked against the element's own props
};
```

`props` is passed to the element when it is rendered (`<element {...props} />`) and is **type-checked** against the element component's prop type — the same type-safety pattern `skip()` uses for `params`. Elements that need no props can omit it.

`active` defaults to `true`. Deactivated elements stay mounted but are removed from keyboard dispatch.

Applying an `elementId` that is already applied on the target layer is a no-op with a development warning (same rapid-reopen protection as `openLayer`). Applying to a layer that is not registered still throws.

### closeLayer / eraseElement / closeAllLayer

```ts
function closeLayer(targetLayerId: string): void
function eraseElement(targetLayerId: string, targetElementId: string): void
function closeAllLayer(): void
```

`closeLayer` on a layer that is not registered and `eraseElement` on an element ID that is not applied are no-ops with development warnings — duplicate closes/erases from rapid key presses are ignored. `eraseElement` on an unregistered layer still throws.

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
