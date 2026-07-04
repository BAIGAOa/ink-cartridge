# Modal System

Modal dialogs that block all keyboard input to screens and overlays. Only one modal is active at a time (the one with the highest zIndex).

## API

### openModal

```ts
function openModal<C extends React.ComponentType<any>>(
  id: string,
  component: C,
  params: React.ComponentProps<C>,
  options?: OpenModalOptions
): void
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `zIndex` | `number` | `modals.length` | Stacking order — highest zIndex is active. |
| `renderNow` | `boolean` | `false` | When `true`, renders even when not the active modal. |
| `persistent` | `boolean` | `false` | When `true`, the modal survives screen navigation (skip/back/gotoScreen). Non-persistent modals are cleared on navigation. Keyboard focus is automatically restored when navigating back to the originating screen and deactivated when navigating away. |

Throws if `id` collides with an existing overlay or modal.

### closeModal

```ts
function closeModal(id: string): void
```

Throws if no modal with that ID exists. The next-highest-zIndex modal becomes active.

### closeAllModals

```ts
function closeAllModals(): void
```

Closes all modals, including persistent ones.

## Modal vs Overlay

| | Overlay | Modal |
|---|---|---|
| Keyboard | Broadcast to all active | Exclusive — only the active modal receives input |
| Activation | Multiple can be active | Single active (highest zIndex) |
| Context | `OverlayContext` | `ModalContext` |
| ID namespace | Shared with modals | Shared with overlays |

## Best Practice

```tsx
function Menu() {
  const { openModal } = useScreenSystem();

  useEffect(() => {
    return boundSequence(['d', 'c'], () => {
      openModal('console', ConsoleModal, {});
    });
  }, []);
}
```
