# useScreenSystem

Hook that returns the full screen system context — the current path, overlay/modals state, and all navigation functions.

## Signature

```ts
function useScreenSystem(): ScreenSystemContextValue
```

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `currentScreen` | `ReactNode` | Rendered element for the current screen. |
| `currentOverlays` | `ReactNode[]` | Rendered elements for all overlays. |
| `currentModals` | `ReactNode[]` | Rendered elements for all modals. |
| `currentPath` | `ComponentType[]` | Screen stack from root to current. |
| `skip` | `SkipFn` | Navigate to child. |
| `back` | `BackFn` | Navigate to parent. |
| `gotoScreen` | `GotoScreenFn` | Jump across branches. |
| `openOverlay` | `OpenOverlayFn` | Open an overlay. |
| `closeOverlay` | `CloseOverlayFn` | Close an overlay by ID. |
| `closeAllOverlays` | `CloseAllOverlaysFn` | Close all overlays. |
| `activateOverlay` | `ActivateOverlayFn` | Activate an overlay. |
| `deactivateOverlay` | `DeactivateOverlayFn` | Deactivate an overlay. |
| `activeOverlayIds` | `string[]` | Currently active overlay IDs. |
| `displayedOverlays` | `OverlayEntry[]` | All displayed overlays with metadata. |
| `displayedModals` | `ModalEntry[]` | All open modals with metadata. |
| `renderedModalEntries` | `ModalEntry[]` | Modal entries that correspond to rendered modal nodes. |
| `activeModalId` | `string \| null` | Currently active modal ID. |
| `activeModal` | `ModalEntry \| null` | Currently active modal entry. |
| `modalQueue` | `ModalEntry[]` | All open modals sorted by zIndex. |
| `openModal` | `OpenModalFn` | Open a modal. |
| `closeModal` | `CloseModalFn` | Close a modal by ID. |
| `closeAllModals` | `CloseAllModalsFn` | Close all modals. |
| `fullScreen` | `boolean \| undefined` | Whether full screen mode is enabled. |

All navigation functions are also available as **module-level imports** (e.g. `import { skip } from 'ink-cartridge'`) — they dispatch through the most recently mounted provider.

## Best Practice

Destructure only what you need:

```tsx
function Menu() {
  const { skip, back } = useScreenSystem();
  // ...
}
```
