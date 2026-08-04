# useMouseRegion

Registers an Ink `<Box>` as a mouse region. The engine hit-tests xterm-mouse events against the element's measured rectangle and fires the callbacks.

Requires a `<KeyboardProvider mouse>` ancestor.

## Signature

```tsx
function useMouseRegion(
  callbacks: MouseRegionCallbacks,
  options?: { layerId?: string; elementId?: string; priority?: number },
): RefObject<DOMElement | null>
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `callbacks.onClick` | `(event, region) => void` | Fired when a click hits the region |
| `callbacks.onEnter` | `(event, region) => void` | Fired when the mouse starts hovering the region |
| `callbacks.onLeave` | `(event) => void` | Fired when the mouse leaves the region |
| `callbacks.onDragStart` | `(event, region) => void` | Fired on the first `drag` event after a press inside the region (a press became a real drag) |
| `callbacks.onDragMove` | `(event, region) => void` | Fired on every `drag` event while dragging |
| `callbacks.onDragEnd` | `(event, region) => void` | Fired on `release` after a drag (plain clicks fire nothing) |
| `options.layerId` | `string` | (Optional) Override the layer the region is attributed to. Defaults to the surrounding layer/modal element, or the shared root layer outside any layer. |
| `options.elementId` | `string` | (Optional) Override the element id. Defaults to the surrounding layer/modal element id, or an auto-generated id. |
| `options.priority` | `number` | (Optional) Hit-test priority within the same layer (default `0`). Higher wins on overlap — use `1` for child controls (buttons) so they beat their container. |

## Returns

A ref to attach to the Ink `<Box>` to track. The rect is re-measured and re-registered after every render, so layout changes stay in sync with the engine.

## Coordinate model

- `useMouseRegion` measures the element via Ink's `measureElement` and registers it in **1-based terminal coordinates** (layout coordinate + 1).
- This assumes the live region starts at the terminal top-left (no viewport offset) — true for full-screen apps.
- Mouse events carry 1-based terminal coordinates, so `event` coordinates are directly comparable to the `region` rect.

## Example

```tsx
const boxRef = useMouseRegion({
  onClick: (event, rect) => {
    const col = event.x - rect.x - 1; // local cell column (1-cell border)
    console.log(`Clicked cell ${col} at ${event.x},${event.y}`);
  },
  onEnter: () => setIsHovered(true),
  onLeave: () => setIsHovered(false),
});
return <Box ref={boxRef}>…</Box>;
```

## Hit priority

Same as keyboard events: **modal layers → regular layers → root regions**, first hit wins. Within a layer, later-registered regions win; `priority` overrides registration order (needed because React mounts children before parents — without it a button would register *before* its panel and lose overlap resolution).

## Related

- [KeyboardProvider](./KeyboardProvider-API.md) — the `mouse` prop enables the xterm-mouse event feed
- [KeyboardEngine](./KeyboardEngine-API.md) — `processMouseEvent` / `registerMouseRegion` / `unregisterMouseRegion` / `getHoveredMouseRegion`
- [useKeyboard](./useKeyboard-API.md) — keyboard bindings share the same layer scoping
