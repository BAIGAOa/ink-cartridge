# Dev Tool

Developer debugging overlay for the ink-router-kit screen system. Renders an absolutely-positioned panel showing real-time navigation state, overlay activity, and position controls.

---

## Quick Start

```tsx
import React, { useEffect, useRef } from 'react';
import { openDevTool, closeDevTool } from '@baigao_h/ink-kit/dev';
import { useKeyboard } from '@baigao_h/ink-kit';

function MyScreen() {
  const { boundKeyboard } = useKeyboard();
  const devOpenRef = useRef(false);

  useEffect(() => {
    boundKeyboard(['ctrl+d'], () => {
      if (devOpenRef.current) {
        closeDevTool();
        devOpenRef.current = false;
      } else {
        openDevTool({ top: 0, left: 0 });
        devOpenRef.current = true;
      }
    });
  }, []);
}
```

## API

### `openDevTool(props)`

Opens the developer debugging overlay. Calls `openOverlay` with the fixed overlay ID `_Dev-Tool_`.

| Param | Type | Description |
|-------|------|-------------|
| `top` | `number` | Initial vertical position in rows (0 = top). |
| `left` | `number` | Horizontal position in columns (0 = left edge). |

**Throws** if the overlay is already open (ID collision). Use a ref to guard against duplicate opens — see the toggle pattern in Quick Start.

### `closeDevTool()`

Closes the developer debugging overlay. Calls `closeOverlay('_Dev-Tool_')`.

**Throws** if no overlay with ID `_Dev-Tool_` exists.

### `DevScreen`

The overlay component itself. Auto-registered via `registerComponent` at module load. Renders as a blue-bordered panel with a black background.

**Keyboard controls** (bound on mount):

| Key | Action |
|-----|--------|
| `↑` | Move the panel up 1 row, clamped to terminal bounds. |
| `↓` | Move the panel down 1 row, clamped to terminal bounds. |

The position automatically re-clamps when the terminal is resized — no keypress needed.

**Display sections**:

- **Path** — breadcrumb of the current screen navigation stack (`Menu > Game > Inventory`). The current screen is highlighted in yellow.
- **Overlays** — list of all open overlays with component names. Active overlays (keyboard-enabled) are green; inactive overlays are gray.
- **Screens** — number of screens on the navigation stack.
- **Top** — current vertical offset and the maximum (e.g. `3/10`).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `top` | `number` | `0` | Initial vertical position in rows. |
| `left` | `number` | `0` | Horizontal position in columns. |

## Notes

- DevScreen uses `position: absolute` — ensure the parent container provides sufficient height context.
- The panel height is fixed at 30 rows. `top` is clamped to `0 ≤ top ≤ rows - 30`.
- The overlay ID `_Dev-Tool_` is reserved — do not reuse it for other overlays.
- The keyboard handler uses a ref-based `clampTop` pattern to avoid stale-closure on the initial terminal size.
- Arrow keys are consumed by the overlay layer and do not propagate to screens below.

## License

MIT
