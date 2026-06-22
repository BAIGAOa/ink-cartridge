# Screen Management System

`ink-kit` provides a tree-based screen navigation system with **tree walking**, **cross-branch jumping**, **overlay**, and **modal** support, allowing you to manage terminal UI screens like pages.

---

## Quick Start

```tsx
import React from 'react';
import { Box, Text, render } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  useScreenSystem,
} from '@baigao_h/ink-kit';

// 1. Register screen components
function Menu() {
  const { skip } = useScreenSystem();
  return (
    <Box flexDirection="column">
      <Text>Main Menu</Text>
      <Text>Press S to start</Text>
    </Box>
  );
}
registerComponent(Menu, {});

function Game({ level }: { level: number }) {
  const { back } = useScreenSystem();
  return (
    <Box>
      <Text>Level {level}</Text>
      <Text>Press B to go back</Text>
    </Box>
  );
}
registerComponent(Game, { level: 1 }, { parent: Menu });

// 2. Wrap with Provider, render CurrentScreen
function App() {
  return <CurrentScreen />;
}

render(
  <ScenarioManagementProvider defaultScreen={Menu}>
    <App />
  </ScenarioManagementProvider>,
);
```

---

## Concept: Screen Tree

Screens form a **tree** via the `parent` option of `registerComponent`:

```
Menu (root)
├── Settings
├── GameLevel
│   ├── Combat
│   └── Inventory
└── QuitConfirm
```

 Operation       | Description                                                      |
 --------------- | ---------------------------------------------------------------- |
 `skip`          | Walk down the tree to a direct child                             |
 `back`          | Walk up the tree toward the root (default 1 level). Pass `back(n)` to go multiple levels |
 `gotoScreen`    | Jump across branches (finds the nearest common ancestor, rebuilds the path) |
 `openOverlay`   | Open a floating overlay with a unique ID                         |
 `closeOverlay`  | Close a specific overlay by ID                                   |
 `closeAllOverlays` | Close all open overlays at once                               |
 `activateOverlay` | Activate an overlay so it receives keyboard events           |
 `deactivateOverlay` | Deactivate an overlay so it stops receiving keyboard events|
 `openModal`      | Open a blocking modal with a unique ID                        |
 `closeModal`     | Close a specific modal by ID                                  |
 `closeAllModals` | Close all open modals at once                                 |
---

## API Reference

### `registerComponent`

```tsx
registerComponent(component, template, options?);
```

Register a component as a screen node.

 Parameter | Type                                    | Description                            |
 --------- | --------------------------------------- | -------------------------------------- |
 component | `React.ComponentType`                   | The component itself, used as unique token |
 template  | `React.ComponentProps<C>`               | Default props                          |
 options   | `{ parent?: React.ComponentType }` | Optional parent to build the tree      |

**Examples**

```tsx
registerComponent(Menu, {});                              // root node
registerComponent(Game, { level: 1 }, { parent: Menu });  // child of Menu
```

**Note**: A component cannot be registered more than once. Duplicate registration throws an error.

---

### `ScenarioManagementProvider`

```tsx
<ScenarioManagementProvider
  defaultScreen={Menu}
  defaultParams={{}}
>
  {children}
</ScenarioManagementProvider>
```

Root context provider wrapping the entire application.

 Prop          | Type                        | Required | Description                                |
 ------------- | --------------------------- | -------- | ------------------------------------------ |
 defaultScreen | `React.ComponentType`       | Yes      | Default screen (must be registered)         |
 defaultParams | `Record<string, unknown>`   | No       | Initial props; falls back to the registered template |

**Validation**: Throws if `defaultScreen` is not registered.

---

### `CurrentScreen`

```tsx
<CurrentScreen />
```

Renders the current top-of-stack screen, all displayed overlays, and all rendered modals.

- No overlays/modals: renders only the stack-top component.
- With overlays: renders the screen first, then overlays on top in zIndex order (lowest zIndex rendered first, highest rendered last — on top visually). Each overlay is wrapped in `OverlayContext.Provider` for keyboard isolation.
- With modals: renders modals after overlays (always visually on top). Each modal is wrapped in `ModalContext.Provider` for keyboard isolation. By default only the active modal (highest zIndex) renders; pass `renderNow: true` to render non-active modals.

---

### `useScreenSystem`

```tsx
const {
  currentScreen,      // ReactNode — the currently rendered screen element
  currentOverlays,    // ReactNode[] — all rendered overlay elements (sorted by zIndex)
  currentModals,      // ReactNode[] — all rendered modal elements (sorted by zIndex)
  currentPath,        // React.ComponentType[] — path from root to stack top
  skip,               // SkipFn
  back,               // BackFn
  gotoScreen,         // GotoScreenFn
  openOverlay,        // OpenOverlayFn
  closeOverlay,       // CloseOverlayFn
  closeAllOverlays,   // CloseAllOverlaysFn
  activateOverlay,    // ActivateOverlayFn
  deactivateOverlay,  // DeactivateOverlayFn
  activeOverlayIds,   // string[] — IDs of overlays currently receiving keyboard events
  displayedOverlays,  // OverlayEntry[] — metadata for all displayed overlays
  activeModalId,      // string | null — ID of the active modal (highest zIndex)
  activeModal,        // ModalEntry | null — the active modal entry
  modalQueue,         // ModalEntry[] — all open modals sorted by zIndex
  openModal,          // OpenModalFn
  closeModal,         // CloseModalFn
  closeAllModals,     // CloseAllModalsFn
} = useScreenSystem();
```

React hook returning the screen system API.

**Must be used inside `<ScenarioManagementProvider>`**, otherwise throws an error.

---

### `skip`

```tsx
skip(component, params, options?);
```

Navigate down the tree to a **direct child**.

 Parameter | Type                            | Description                                      |
 --------- | ------------------------------- | ------------------------------------------------ |
 component | `React.ComponentType`           | Target component (must be a direct child of the current screen) |
 params    | `React.ComponentProps<C>`       | Props passed to the component (merged with template) |

**Validation**: Throws if the target is not a direct child of the current screen.

---

### `back`

```tsx
back(levels?);
```

Navigate up the tree toward the root.

| Parameter | Type     | Default | Description                                |
| --------- | -------- | ------- | ------------------------------------------ |
| levels    | `number` | `1`     | Number of levels to go back. Must be >= 1. |

```tsx
back();      // go back 1 level (parent)
back(2);     // go back 2 levels at once
```

**Validation**:
- Throws if `levels < 1`.
- Throws if at the root node (`levels >= current depth`).

---

### `gotoScreen`

```tsx
gotoScreen(component, params);
```

Jump to any registered screen, even across branches.

```tsx
// From Combat (Menu → GameLevel → Combat) jump directly to Settings (Menu → Settings)
gotoScreen(Settings, { theme: 'light' });
```

Automatically finds the nearest common ancestor and rebuilds the path.

**Validation**: Throws if the component is not registered.

---

### `openOverlay`

```tsx
openOverlay(id, component, params, options?);
```

Open a floating overlay on top of the screen stack. Multiple overlays can coexist, distinguished by unique IDs.

```tsx
openOverlay('pause-1', PauseMenu, { message: 'Paused' });
openOverlay('notif-1', Notification, { message: 'Item collected!' }, { zIndex: 10 });
```

| Parameter | Type                          | Description                                      |
| --------- | ----------------------------- | ------------------------------------------------ |
| id        | `string`                      | Unique identifier for this overlay               |
| component | `React.ComponentType`         | Overlay component (must be registered)           |
| params    | `React.ComponentProps<C>`     | Props passed to the overlay                      |
| options   | `OpenOverlayOptions`          | Optional: `{ activate?: boolean, zIndex?: number }` |

**Options**:
- `activate` — Whether to activate the overlay immediately (default `true`). Inactive overlays render but don't receive keyboard events.
- `zIndex` — Visual stacking order. Smaller values render behind larger values. Defaults to the current overlay count.

**Key points**:
- Multiple overlays can be open simultaneously, each with a unique ID.
- Overlays do **not** modify `currentPath`.
- Performing `skip` / `back` / `gotoScreen` **automatically closes all** overlays.
- Reusing an existing ID throws an error.

---

### `closeOverlay`

```tsx
closeOverlay(id);
```

Close a specific overlay by its ID.

```tsx
closeOverlay('pause-1');
```

Throws if no overlay with the given ID exists.

---

### `closeAllOverlays`

```tsx
closeAllOverlays();
```

Close all open overlays at once.

---

### `activateOverlay`

```tsx
activateOverlay(id);
```

Activate an overlay by its ID so it starts receiving keyboard events.

Throws if no overlay with the given ID exists.

---

### `deactivateOverlay`

```tsx
deactivateOverlay(id);
```

Deactivate an overlay by its ID so it stops receiving keyboard events while staying visible.

Throws if no overlay with the given ID exists.

---

### `openModal`

```tsx
openModal(id, component, params, options?);
```

Open a blocking modal on top of all overlays. Modals have **absolute keyboard priority** — when a modal is active, no other layer (global keys, overlays, or screens) receives keyboard events.

```tsx
openModal('confirm-1', ConfirmDialog, { message: 'Delete this file?' });
openModal('error-1', ErrorModal, { message: 'Network error' }, { zIndex: 10 });
```

| Parameter | Type                          | Description                                      |
| --------- | ----------------------------- | ------------------------------------------------ |
| id        | `string`                      | Unique identifier for this modal                 |
| component | `React.ComponentType`         | Modal component (must be registered)             |
| params    | `React.ComponentProps<C>`     | Props passed to the modal                        |
| options   | `OpenModalOptions`            | Optional: `{ zIndex?: number, renderNow?: boolean }` |

**Options**:
- `zIndex` — Determines which modal is active. The modal with the highest zIndex is the active modal and receives all keyboard events. Defaults to the current modal count.
- `renderNow` — Whether to render the modal even when it is not the active modal (default `false`). Non-active modals with `renderNow: true` are visible but do **not** receive keyboard events.

**Key points**:
- Only ONE modal is active at a time — the one with the highest zIndex (equal zIndex → most recently opened wins).
- The active modal **blocks all keyboard events** from reaching global keys, overlays, and screens. Keys not bound in the modal are still consumed.
- Use `ModalContext` inside the modal component to obtain the modal's ID.
- Performing `skip` / `back` / `gotoScreen` **automatically closes all** modals.
- Reusing an existing modal ID throws an error.

**Modal vs Overlay**:

|                  | Modal                     | Overlay                    |
| ---------------- | ------------------------- | -------------------------- |
| Keyboard priority | Absolute (blocks all)    | Broadcast to active ones   |
| Active count     | Exactly one (highest zIndex) | Multiple (all activated) |
| Activate/deactivate | ❌ (zIndex-driven only) | ✅ activateOverlay / deactivateOverlay |
| Use case         | Blocking dialogs (confirm, alert, error) | Floating panels, tooltips, sidebars |

---

### `closeModal`

```tsx
closeModal(id);
```

Close a specific modal by its ID. The modal with the next highest zIndex automatically becomes active.

```tsx
closeModal('confirm-1');
```

Throws if no modal with the given ID exists.

---

### `closeAllModals`

```tsx
closeAllModals();
```

Close all open modals at once. Keyboard control returns to the layer below (overlay or screen).

---

### Module-Level Functions

`skip`, `back`, `gotoScreen`, `openOverlay`, `closeOverlay`, `closeAllOverlays`, `activateOverlay`, `deactivateOverlay`, `openModal`, `closeModal`, and `closeAllModals` can also be used as **module-level imports** without a React component context.

```tsx
import { skip, back, gotoScreen, openOverlay, closeOverlay, openModal, closeModal } from '@baigao_h/ink-kit';

// Use anywhere in .ts/.tsx files
skip(Game, { level: 5 });
openOverlay('pause', PauseMenu, {});
closeOverlay('pause');
openModal('confirm', ConfirmDialog, { message: 'OK?' });
closeModal('confirm');
```

**Note**: Module-level functions require `<ScenarioManagementProvider>` to be mounted. Calling them before the provider is mounted throws an error.

---

## Type Safety

All navigation functions are type-safe — `skip`, `gotoScreen`, `openOverlay`, and `openModal` automatically infer prop types from your component:

```tsx
// Ok — type checks
skip(Game, { level: 1 });
openOverlay('dialog', ConfirmDialog, { message: 'Are you sure?' });
openModal('confirm', ConfirmDialog, { message: 'Delete?' });

// Type error: Game has no `title` prop
skip(Game, { title: 'hello' });
//   ^^^^^  TypeScript error
```

---

## Common Errors

 Error Message                                                | Cause                                         |
 ------------------------------------------------------------ | --------------------------------------------- |
 Component "xxx" is not registered. Please call registerComponent() first. | The component was not registered via `registerComponent` |
 "xxx" is not a child of "yyy".                               | `skip` target is not a direct child of the current screen |
 back() failed: already at root node, cannot go back.          | `back` was called at the root                 |
 skip() called before Provider was mounted.                    | Module-level function called before the provider was mounted |
 Overlay with id "xxx" already exists.                        | `openOverlay` called with an ID that is already in use |
 Cannot close overlay "xxx": no overlay with that ID exists.   | `closeOverlay` called with an unknown ID       |
 Cannot activate overlay "xxx": no overlay with that ID exists. | `activateOverlay` called with an unknown ID    |
 Cannot deactivate overlay "xxx": no overlay with that ID exists. | `deactivateOverlay` called with an unknown ID  |
 Modal with id "xxx" already exists.                            | `openModal` called with an ID that is already in use |
 Cannot close modal "xxx": no modal with that ID exists.        | `closeModal` called with an unknown ID         |
 Cannot open modal "xxx": this ID is already in use by an overlay. | `openModal` called with an ID that matches an open overlay |
 Cannot open overlay "xxx": this ID is already in use by a modal. | `openOverlay` called with an ID that matches an open modal |
