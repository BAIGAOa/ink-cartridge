# Dev Tool

Developer debugging modal for the ink-cartridge screen system. Renders an absolutely-positioned panel showing real-time navigation state, overlay activity, modal activity, and position controls.

When open, DevScreen is a **modal** — it blocks all keyboard events from reaching overlays and screens. The panel provides its own Escape key to close.

---

## Quick Start

```tsx
import React, { useEffect, useRef } from 'react';
import { openDevTool, closeDevTool } from 'ink-cartridge/dev';
import { useKeyboard } from 'ink-cartridge';

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

Opens the developer debugging modal. Calls `openModal` with the fixed modal ID `_Dev-Tool_`.

| Param | Type | Description |
|-------|------|-------------|
| `top` | `number` | Initial vertical position in rows (0 = top). |
| `left` | `number` | Horizontal position in columns (0 = left edge). |

**Throws** if the modal is already open (ID collision). Use a ref to guard against duplicate opens — see the toggle pattern in Quick Start.

**Important**: Since DevScreen is a modal, once opened it blocks all external keyboard events. The DevScreen itself provides an Escape binding to close.

### `closeDevTool()`

Closes the developer debugging modal. Calls `closeModal('_Dev-Tool_')`.

**Throws** if no modal with ID `_Dev-Tool_` exists.

### `DevScreen`

The modal component itself. Auto-registered via `registerComponent` at module load. Renders as a blue-bordered panel with a black background.

**Keyboard controls** (bound on mount):

| Key | Action |
|-----|--------|
| `↑` | Move the panel up 1 row, clamped to terminal bounds. |
| `↓` | Move the panel down 1 row, clamped to terminal bounds. |
| `Escape` | Close the DevScreen modal. |

The position automatically re-clamps when the terminal is resized — no keypress needed.

**Display sections**:

- **Path** — breadcrumb of the current screen navigation stack (`Menu > Game > Inventory`). The current screen is highlighted in yellow.
- **Overlays** — list of all open overlays with component names. Active overlays (keyboard-enabled) are green; inactive overlays are gray.
- **Modals** — list of all open modals with component names. The active modal (highest zIndex) is green; inactive modals are gray.
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
- The modal ID `_Dev-Tool_` is reserved — do not reuse it for other modals.
- The keyboard handler uses a ref-based `clampTop` pattern to avoid stale-closure on the initial terminal size.
- As a modal, DevScreen blocks all keyboard events from reaching lower layers (overlays, screens, global keys). Close it with Escape to restore normal keyboard handling.

## License

MIT
