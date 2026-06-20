# DevTool

A built-in debugging panel for ink-router-kit applications. Displays the current
screen stack, active overlays, and keyboard bindings in real time.

## Install

The DevTool is included with `@baigao_h/ink-kit` — no extra packages needed.

```bash
npm install @baigao_h/ink-kit
```

## Quick Start

```tsx
import React from 'react';
import { render } from 'ink';
import {
  ScenarioManagementProvider,
  KeyboardProvider,
  CurrentScreen,
  registerComponent,
  openDevTool,
} from '@baigao_h/ink-kit';

function Menu() {
  return <Text>Menu — press F12 to open DevTool</Text>;
}
Menu.displayName = 'Menu';

registerComponent(Menu, {});

function App() {
  return (
    <ScenarioManagementProvider defaultScreen={Menu}>
      <KeyboardProvider>
        <CurrentScreen />
      </KeyboardProvider>
    </ScenarioManagementProvider>
  );
}

render(<App />);

// Open the panel from anywhere (e.g. a global key)
openDevTool();
```

## API

### `openDevTool(props?)`

Open the DevTool panel as an overlay. Registers the DevTool component
automatically on first call (no manual `registerComponent` needed).

Must be called after `<ScenarioManagementProvider>` is mounted.

| Param | Type | Description |
|-------|------|-------------|
| `props` | `DevToolProps` | Optional props for the panel |

### `closeDevTool()`

Close the DevTool panel.

- **Throws** if the DevTool is not currently open (detailed error with the overlay ID)
- **Throws** if the provider is not mounted

### `DevTool`

The panel component itself. Normally you don't need to use it directly —
prefer `openDevTool()` / `closeDevTool()`.

### `DEVTOOL_OVERLAY_ID`

The well-known overlay ID used by the DevTool (`'__ink_devtool__'`).
Avoid using this ID for your own overlays.

## What It Shows

The DevTool panel displays four sections:

### 1. Screen Stack

Lists all screens in the current navigation path from root to current screen.
The current screen is marked with `← current`.

### 2. Active Overlays

Lists all open overlays with their ID, component name, z-index, and whether
they are active (receiving keyboard events). The DevTool panel itself is also
shown and marked as `this panel`.

### 3. Keyboard

For the current screen and each overlay, displays:
- **Screen bindings** — key names with `onlyThis`, `when`, and `times` flags
- **Blocked / Stopped** — count of transparent and propagation-barrier keys
- **Focus targets** — named targets with their binding count; the active target is marked with `✓`
- **Sequences** — registered multi-key sequences
- **Pending sequence** — whether a sequence match is in progress

### 4. Global Keys & Sequences

Lists all registered global key and sequence entries with their `affectOverlay`,
`cover`, `when`, and `times` settings.

## Examples

### Toggle with a global key

```tsx
import { globalKeys } from './keyboard-bindings';

let devToolOpen = false;

globalKeys([
  {
    key: 'f12',
    operate: () => {
      if (devToolOpen) {
        closeDevTool();
        devToolOpen = false;
      } else {
        openDevTool();
        devToolOpen = true;
      }
    },
  },
]);
```

### Open from a screen component

```tsx
function Menu() {
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    return boundKeyboard(['ctrl+d'], () => {
      openDevTool();
    });
  }, [boundKeyboard]);

  return <Text>Press Ctrl+D for DevTool</Text>;
}
```

### Close on overlay close

```tsx
// The DevTool can also be closed by pressing q or Escape inside the panel.
// The panel binds these keys automatically.
```

## License

MIT
