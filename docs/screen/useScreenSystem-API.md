# useScreenSystem

Hook that returns the full screen system context — the current path, layer/modal-layer state, and all navigation functions.

## Signature

```ts
function useScreenSystem(): ScreenSystemContextValue
```

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `pageLayer` | `ReactNode` | Rendered element for the current screen. |
| `currentPath` | `ComponentType[]` | Screen stack from root to current. |
| `allLayers` | `Layer[]` | All open layers sorted by zIndex. |
| `allModalLayers` | `ModalLayer[]` | All open modal layers sorted by zIndex. |
| `skip` | `SkipFn` | Navigate to child. |
| `back` | `BackFn` | Navigate to parent. |
| `gotoScreen` | `GotoScreenFn` | Jump across branches. |
| `openLayer` | `OpenLayerFn` | Open a layer. |
| `applyElement` | `ApplyElementFn` | Add an element to a layer. |
| `closeLayer` | `CloseLayerFn` | Close a layer by ID. |
| `eraseElement` | `EraseElementFn` | Remove an element from a layer. |
| `closeAllLayer` | `CloseAllLayerFn` | Close all layers. |
| `activateElement` | `ActivateElementFn` | Reactivate a layer element. |
| `deactivateElement` | `DeactivateElementFn` | Deactivate a layer element. |
| `openModalLayer` | `OpenModalLayerFn` | Open a modal layer. |
| `applyElementToModalLayer` | `ApplyElementToModalLayerFn` | Add an element to a modal layer. |
| `closeModalLayer` | `CloseModalLayerFn` | Close a modal layer by ID. |
| `eraseElementInModalLayer` | `EraseElementInModalLayerFn` | Remove an element from a modal layer. |
| `closeAllModalLayer` | `CloseAllModalLayerFn` | Close all modal layers. |
| `activateElementInModalLayer` | `ActivateElementInModalLayerFn` | Reactivate a modal-layer element. |
| `deactivateElementInModalLayer` | `DeactivateElementInModalLayerFn` | Deactivate a modal-layer element. |
| `fullScreen` | `boolean \| undefined` | Whether full screen mode is enabled. |

Navigation functions are also available as **module-level imports** (e.g. `import { skip } from 'ink-cartridge'`) — they dispatch through the most recently mounted provider.

## Best Practice

Destructure only what you need:

```tsx
function Menu() {
  const { openLayer, applyElement, closeLayer } = useScreenSystem();
  // ...
}
```
