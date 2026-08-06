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
| `callbacks.onWheel` | `(event, region) => void` | Fired when a wheel event hits the region; `event.button` is `'wheel-up'`/`'wheel-down'`/`'wheel-left'`/`'wheel-right'` |
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

## Terminal compatibility

Click detection depends on the terminal reporting mouse events correctly (press → release → synthesized click). Most terminals (Windows Terminal, PowerShell, iTerm2, …) do.

**VS Code's built-in terminal** (xterm.js) can stop reporting `release` events after multiple buttons are pressed simultaneously — afterwards it only sends `press`, so clicks would never be synthesized. The engine detects this "press storm" (consecutive presses with no release, arriving within a short time window) and **degrades to press-is-click mode**: each press at a new position fires `onClick` (same-position duplicate presses are deduplicated, since one terminal click may be reported as several button presses). Any `release` event restores normal behavior.

The storm detection is deliberately guarded so a well-behaved terminal rarely enters degraded mode:

- The `pressStormWindowMs` time window means only presses arriving **close together** count toward the storm — a slow, deliberate multi-button press never does.
- A well-behaved terminal can still (rarely) trip it by pressing **three buttons quickly** (left+middle+right). The cost is at most one extra `onClick` and a transient degraded state until the next release. To eliminate even that, set `pressStormThreshold: Infinity` (disables degraded mode entirely; the VS Code fallback then no longer works).

All knobs are configurable on the underlying `Mouse` instance via `KeyboardProvider mouseOptions`:

| Option | Default | Description |
|--------|---------|-------------|
| `pressStormThreshold` | `3` | Consecutive presses with no release that trigger degraded mode. `Infinity` disables it. |
| `pressStormWindowMs` | `500` | How long presses may span while still counting toward the storm. A press after this window restarts the count. `Infinity` removes the time limit. |
| `degradedDedupDistance` | `1` | In degraded mode, presses within this many cells of the last synthesized click are treated as the same click. |
| `degradedDedupWindowMs` | `300` | In degraded mode, how long a synthesized click's position stays deduplicated — a press at the same spot after this window is a new click. |

## Related

- [KeyboardProvider](./KeyboardProvider-API.md) — the `mouse` prop enables the xterm-mouse event feed
- [KeyboardEngine](./KeyboardEngine-API.md) — `processMouseEvent` / `registerMouseRegion` / `unregisterMouseRegion` / `getHoveredMouseRegion`
- [useKeyboard](./useKeyboard-API.md) — keyboard bindings share the same layer scoping
