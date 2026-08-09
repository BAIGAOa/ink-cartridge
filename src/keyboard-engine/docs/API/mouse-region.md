# mouse-region

Mouse hit-testing for the engine: register rectangular regions, feed mouse events, and receive hit callbacks — including wheel events.

Covers `registerMouseRegion`, `unregisterMouseRegion`, `processMouseEvent`, `getHoveredMouseRegion`.

## registerMouseRegion

### Summary

Register a rectangular region (in 1-based terminal coordinates) that mouse events are hit-tested against.

### Signature

```ts
registerMouseRegion(entry: MouseRegionEntry): () => void
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `entry.layerId` | `string` | The layer this region belongs to. Must match a `layerId` from `sync()` so hit priority follows the same modal > layer > root order as keyboard events. |
| `entry.regionId` | `string` | Unique identifier for this region within the layer. Caller-chosen — it is **not** a keyboard layer element id (regions are independent of `activeElements`); duplicate ids in the same layer overwrite each other. |
| `entry.rect` | `MouseRegionRect` | Region geometry: `{ x, y, width, height }` in **1-based terminal coordinates**. |
| `entry.callbacks` | `MouseRegionCallbacks` | Optional callbacks: `onClick`, `onWheel`, `onEnter`, `onLeave`, `onDragStart`, `onDragMove`, `onDragEnd`. |
| `entry.priority` | `number` | (Optional) Hit-test priority within the same layer (default `0`). Higher wins on overlap — use `1` for child controls so they beat their container. |

`MouseRegionRect` coordinates are 1-based terminal columns/rows — the same space xterm-mouse events report. Host frameworks are responsible for converting their layout coordinates (e.g. adding the live-region viewport offset).

### Returns

An unregister function (idempotent). Re-registering the same `layerId` + `regionId` overwrites rect and callbacks while preserving registration order.

### Effect

Adds the region to the hit-test registry. No events fire until `processMouseEvent` is fed events. Regions outside any synced layer fall back to the shared root layer (`ROOT_MOUSE_LAYER_ID`), hit-tested last.

### Usage

```ts
const unbind = engine.registerMouseRegion({
  layerId: 'board-screen',
  regionId: 'board',
  rect: { x: 1, y: 1, width: 40, height: 20 },
  callbacks: {
    onClick: (event, rect) => selectCell(event.x, event.y),
    onWheel: (event) => {
      if (event.button === 'wheel-up') scrollUp();
      if (event.button === 'wheel-down') scrollDown();
    },
  },
});
```

## unregisterMouseRegion

### Summary

Remove a mouse region by `layerId` + `regionId` (idempotent).

### Signature

```ts
unregisterMouseRegion(layerId: string, regionId: string): void
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `layerId` | `string` | The layer the region was registered under. |
| `regionId` | `string` | The element id within that layer. |

### Returns

Nothing (`void`).

### Effect

Deletes the region from the hit-test registry. Also clears hover/drag state that pointed at the removed region, so a disappearing element never leaves a stale hover or drag target behind.

### Usage

```ts
// Prefer the unregister function returned by registerMouseRegion for
// symmetric cleanup; unregisterMouseRegion exists for cases where the
// original registration handle was lost or re-registered multiple times.
engine.unregisterMouseRegion('board-screen', 'board');
```

## processMouseEvent

### Summary

Feed a mouse event into the region hit-testing and fire the matching callbacks.

### Signature

```ts
processMouseEvent(event: XtermMouseEvent): boolean
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `event` | `XtermMouseEvent` | A mouse event from the host framework's mouse adapter. `event.action` is one of `move` / `click` / `wheel` / `press` / `drag` / `release`; `event.button` is `'left'` / `'middle'` / `'right'` / `'wheel-up'` / `'wheel-down'` / `'wheel-left'` / `'wheel-right'` / `'back'` / `'forward'` / `'none'` / `'unknown'`. Coordinates are 1-based terminal columns/rows. |

### Returns

`true` if the event hit a registered region, `false` otherwise.

### Effect

Dispatches by action:

- `move` events drive hover transitions — `onEnter` on entry, `onLeave` on exit.
- `click` events fire `onClick` (hit-test only).
- `wheel` events fire `onWheel` (hit-test only, same priority chain).
- `press`/`drag`/`release` drive the drag lifecycle: a `press` inside a region arms a drag capture; the first `drag` event promotes it and fires `onDragStart`/`onDragMove`; `release` fires `onDragEnd` (only if a real drag happened — plain clicks stay silent).

Hit priority follows keyboard events: **modal layers → regular layers → root regions**, first hit wins; within a layer, later-registered regions win unless `priority` overrides. While a modal layer is open it **takes over hit-testing** exactly like the keyboard modal priority — events that miss the modal do not fall through to regular layers or root regions, so clicking "through" a modal can never trigger the UI underneath.

### Usage

```ts
// Host framework: parse raw stdin bytes into XtermMouseEvent and forward them.
// (The `Mouse` helper from @cartridge-engine/keyboard-engine does the parsing.)
engine.processMouseEvent(event);
```

## getHoveredMouseRegion

### Summary

Return the region currently hovered (the last `move` event's hit target), or `null`.

### Signature

```ts
getHoveredMouseRegion(): { layerId: string; regionId: string } | null
```

### Returns

A copy of `{ layerId, regionId }` for the hovered region, or `null` when nothing is hovered.

### Effect

None — a read-only query. Useful for showing hover state (e.g. tooltips) driven by the engine rather than the framework's own hover tracking.

### Usage

```ts
const hovered = engine.getHoveredMouseRegion();
if (hovered) {
  showTooltip(hovered.regionId);
}
```

## API interactions

- **[`sync`](./sync.md)** — `layerId` must match a synced layer id so hit priority follows the modal > layer > root order; regions hit-test independently of the layers' `activeElements`.
- **[`Mouse`](../README.md)** — the engine does not parse raw terminal bytes; pair `processMouseEvent` with the `Mouse` helper (or your own parser) that turns stdin data into `XtermMouseEvent`s.
- **[`useMouseRegion`](../../../../docs/keyboard/useMouseRegion-API.md)** — the React/Ink adapter registers a region per `<Box>` and feeds `processMouseEvent` automatically; it also filters mouse escape sequences out of the keyboard stream.
