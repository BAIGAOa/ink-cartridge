# sync

Push screen-path and overlay/modal state from the host framework into the engine.

The engine does not observe the host framework's component tree — it relies on `sync` being called on every render to build an accurate snapshot. Call `sync` **before** any keyboard events in the same render cycle so that [`processKey`](./processKey.md) sees a fresh snapshot.

## Signature

```ts
sync(state: {
  path: unknown[];
  activeOverlayIds: string[];
  displayedOverlays: EngineOverlayEntry[];
  activeModalId: string | null;
  displayedModals: EngineModalEntry[];
}): void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `path` | `unknown[]` | Current navigation path from root to the active screen component. |
| `activeOverlayIds` | `string[]` | IDs of overlays currently receiving keyboard events. |
| `displayedOverlays` | `EngineOverlayEntry[]` | All open overlays (typically sorted by zIndex ascending). Only needs the `id` field for layer lookup. |
| `activeModalId` | `string \| null` | ID of the currently active modal (highest zIndex), or `null` if none. |
| `displayedModals` | `EngineModalEntry[]` | All open modals (sorted by zIndex ascending). Only needs the `id` field for layer lookup. |

## Returns

Nothing (`void`).

## Effect

Overwrites the engine's internal snapshot of the host framework's screen/overlay/modal state synchronously:

- `state.path` → `this.path` (screen navigation stack)
- `state.activeOverlayIds` → `this.activeOverlayIds` (which overlays receive events)
- `state.displayedOverlays` → `this.displayedOverlays` (all open overlays)
- `state.activeModalId` → `this.activeModalIdRef`
- `state.displayedModals` → `this.displayedModalsRef`

The write is a direct field assignment — no merging, no diff, no incremental update. Cleanup of stale layers happens separately via [`cleanLayers`](./cleanLayers.md) / [`cleanOverlayLayers`](./cleanLayers.md) / [`cleanModalLayers`](./cleanLayers.md), called in a post-render effect.

## Usage

```ts
// Call synchronously on every render — before any processKey() calls
engine.sync({
  path: getCurrentPath(),
  activeOverlayIds: getActiveOverlayIds(),
  displayedOverlays: getDisplayedOverlays(),
  activeModalId: getActiveModalId(),
  displayedModals: getDisplayedModals(),
});

// Then forward keyboard events
useInput((input, key) => engine.processKey(input, key));
```

Cleanup must happen in a post-render effect so it can compare pre- and post-sync state:

```ts
// In a post-render effect (useEffect in React, watchEffect in Vue, etc.):
engine.cleanLayers();
engine.cleanOverlayLayers();
engine.cleanModalLayers();
```

## API interactions

- **[`processKey`](./processKey.md)** — must be preceded by `sync` in the same render cycle; otherwise the pipeline sees stale screen/overlay/modal state
- **[`cleanLayers`](./cleanLayers.md)** — removes keyboard layers for screens no longer in the current path; called after `sync` in an effect
- **[`cleanOverlayLayers`](./cleanLayers.md)** / **[`cleanModalLayers`](./cleanLayers.md)** — removes layers for closed overlays/modals; called after `sync` in an effect
- **[`boundKeyboard`](./boundKeyboard.md)** — bindings registered via `boundKeyboard` are stored on layers keyed by the current owner (derived from the path set by `sync`)
