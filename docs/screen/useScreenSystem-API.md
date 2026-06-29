# useScreenSystem

Hook that returns the full screen system context — the current path, overlay/modals state, and all navigation functions.

## Signature

```ts
function useScreenSystem(): ScreenSystemContextValue
```

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `currentPath` | `ComponentType[]` | Screen stack from root to current. |
| `skip` | `SkipFn` | Navigate to child. |
| `back` | `BackFn` | Navigate to parent. |
| `gotoScreen` | `GotoScreenFn` | Jump across branches. |
| `openOverlay` | `OpenOverlayFn` | Open an overlay. |
| `closeOverlay` | `CloseOverlayFn` | Close an overlay by ID. |
| `closeAllOverlays` | `CloseAllOverlaysFn` | Close all overlays. |
| `activateOverlay` | `ActivateOverlayFn` | Activate an overlay. |
| `deactivateOverlay` | `DeactivateOverlayFn` | Deactivate an overlay. |
| `openModal` | `OpenModalFn` | Open a modal. |
| `closeModal` | `CloseModalFn` | Close a modal by ID. |
| `closeAllModals` | `CloseAllModalsFn` | Close all modals. |
| `activeOverlayIds` | `string[]` | Currently active overlay IDs. |
| `activeModalId` | `string \| null` | Currently active modal ID. |

All navigation functions are also available as **module-level imports** (e.g. `import { skip } from 'ink-cartridge'`) — they dispatch through the most recently mounted provider.

## Best Practice

Destructure only what you need:

```tsx
function Menu() {
  const { skip, back } = useScreenSystem();
  // ...
}
```
