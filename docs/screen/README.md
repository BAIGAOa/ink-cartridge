# Screen System

## Why

Terminal apps have no router, no `<Link>`, no page stack. The screen system provides tree-based navigation — screens form a parent-child tree, and navigation functions (`skip`, `back`, `gotoScreen`) walk that tree. Layers and modal layers float above the stack independently.

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
CurrentScreen      ── renders current screen → layers → modal layers
```

Navigation rules:
- `skip(Child)` — only to a direct child of the current screen
- `back(n?)` — up `n` levels toward root
- `gotoScreen(Target)` — jump across branches via lowest common ancestor
- All navigation clears non-`crossPage` layers and modal layers. Use `crossPage: true` when opening a layer or modal layer to preserve it across navigation.

Layers and modal layers share a common ID namespace. A layer is a floating panel that can contain multiple elements and coexist with other layers. A modal layer is exclusive — only the highest-`zIndex` modal layer receives keyboard input.

## API Index

| API | Purpose |
|-----|---------|
| [registerComponent](./registerComponent-API.md) | Register a screen in the navigation tree |
| [ScenarioManagementProvider](./ScenarioManagementProvider-API.md) | Root provider — holds navigation state |
| [CurrentScreen](./CurrentScreen-API.md) | Renders the active screen + layers + modal layers |
| [useScreenSystem](./useScreenSystem-API.md) | Hook — access all navigation functions |
| [skip](./skip-API.md) | Navigate to a child screen |
| [back](./back-API.md) | Navigate up to parent |
| [gotoScreen](./gotoScreen-API.md) | Jump across branches via LCA |
| [Layer system](./overlay-API.md) | openLayer / applyElement / closeLayer / closeAllLayer / activateElement / deactivateElement |
| [Modal layer system](./modal-API.md) | openModalLayer / applyElementToModalLayer / closeModalLayer / closeAllModalLayer |
| [ModalLayerElementContext](./ModalLayerElementContext-API.md) | Context for a modal-layer element |
| `clearDispatchers()` | Test utility — clears stale dispatch references between test runs |

## Advanced

See [advanced.md](./advanced.md)
