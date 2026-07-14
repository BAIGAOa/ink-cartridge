# Screen System

## Why

Terminal apps have no router, no `<Link>`, no page stack. The screen system provides tree-based navigation — screens form a parent-child tree, and navigation functions (`skip`, `back`, `gotoScreen`) walk that tree. Overlays and modals float above the stack independently.

## Architecture

```
registerComponent(Menu, {})
registerComponent(Game, {}, { parent: Menu })
registerComponent(Settings, {}, { parent: Menu })
        │
        ▼  builds a navigation tree (registry.ts)
        │
ScenarioManagementProvider
        │  useReducer manages ScreenState
        │
        ▼
useScreenSystem()  ── returns state + all navigation functions
        │
CurrentScreen      ── renders current screen → overlays → modals
```

Navigation rules:
- `skip(Child)` — only to a direct child of the current screen
- `back(n?)` — up `n` levels toward root
- `gotoScreen(Target)` — jump across branches via lowest common ancestor
- All navigation clears non-persistent overlays and modals. Use `persistent: true` on overlay/modal to preserve them across navigation.

Overlays and modals share a common ID namespace. An overlay is a floating panel that can coexist with other overlays. A modal is exclusive — only the highest-zIndex modal receives keyboard input.

## API Index

| API | Purpose |
|-----|---------|
| [registerComponent](./registerComponent-API.md) | Register a screen in the navigation tree |
| [ScenarioManagementProvider](./ScenarioManagementProvider-API.md) | Root provider — holds navigation state |
| [CurrentScreen](./CurrentScreen-API.md) | Renders the active screen + overlays + modals |
| [useScreenSystem](./useScreenSystem-API.md) | Hook — access all navigation functions |
| [skip](./skip-API.md) | Navigate to a child screen |
| [back](./back-API.md) | Navigate up to parent |
| [gotoScreen](./gotoScreen-API.md) | Jump across branches via LCA |
| [Overlay system](./overlay-API.md) | openOverlay / closeOverlay / closeAllOverlays / activateOverlay / deactivateOverlay |
| [Modal system](./modal-API.md) | openModal / closeModal / closeAllModals |
| [ModalContext](./ModalContext-API.md) | Context for per-instance modal ID |

## Advanced

See [advanced.md](./advanced.md)
