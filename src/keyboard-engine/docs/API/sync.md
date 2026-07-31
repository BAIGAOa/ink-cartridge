# sync

Push screen-path, layer, and modal-layer state from the host framework into the engine.

The engine does not observe the host framework's component tree — it relies on `sync` being called on every render to build an accurate snapshot. Call `sync` **before** any keyboard events in the same render cycle so that [`processKey`](./processKey.md) sees a fresh snapshot.

## Signature

```ts
sync(state: {
  pagePath: unknown[];
  layers: KeyboardLayer[];
  modalLayers: KeyboardLayer[];
}): void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `pagePath` | `unknown[]` | Current navigation path from root to the active screen component. |
| `layers` | `KeyboardLayer[]` | All open layers, sorted by zIndex ascending. |
| `modalLayers` | `KeyboardLayer[]` | All open modal layers, sorted by zIndex ascending. |

`KeyboardLayer` shape:

```ts
type KeyboardLayer = {
  layerId: string;
  elements: string[];
  activeElements: string[];
};
```

## Returns

Nothing (`void`).

## Effect

Overwrites the engine's internal snapshot synchronously:

- `state.pagePath` → page navigation stack
- `state.layers` → normal layers
- `state.modalLayers` → modal layers

The write is a direct field assignment — no merging, no diff, no incremental update. Cleanup of stale layers happens separately via [`cleanLayers`](./cleanLayers.md) / [`cleanOverlayLayers`](./cleanLayers.md) / [`cleanModalLayers`](./cleanLayers.md), called in a post-render effect.

## Usage

```ts
// Call synchronously on every render — before any processKey() calls
engine.sync({
  pagePath: getCurrentPath(),
  layers: getLayers(),
  modalLayers: getModalLayers(),
});

// Then forward keyboard events
useInput((input, key) => engine.processKey(input, key));
```

Cleanup must happen in a post-render effect so it can compare pre- and post-sync state:

```ts
engine.cleanLayers();
engine.cleanOverlayLayers();
engine.cleanModalLayers();
```

## API interactions

- **[`processKey`](./processKey.md)** — must be preceded by `sync` in the same render cycle
- **[`cleanLayers`](./cleanLayers.md)** — removes keyboard layers for screens no longer in the current path
- **[`cleanOverlayLayers`](./cleanLayers.md)** / **[`cleanModalLayers`](./cleanLayers.md)** — removes layers for closed layers/modal layers
- **[`boundKeyboard`](./boundKeyboard.md)** — bindings are stored on the current page, layer, or modal-layer element
