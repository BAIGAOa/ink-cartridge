
# Keyboard System

ink-trc provides a **layered keyboard event system** built on top of the screen management tree. Instead of a single global `useInput` with messy `if-else` chains, you get **per-screen-layer** key bindings with transparent keys, propagation barriers, and global shortcuts.

---

## Quick Start

```tsx
import React, { useEffect } from 'react';
import { Box, Text, render } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  useScreenSystem,
  KeyboardProvider,
  useKeyboard,
} from 'ink-trc';

// 1. Register screen components
function Menu() {
  const { skip } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    boundKeyboard(['s'], () => skip(Game, { level: 1 }));
    boundKeyboard(['q'], () => process.exit());
  }, []);

  return (
    <Box flexDirection="column">
      <Text>Main Menu</Text>
      <Text>[S] Start Game  [Q] Quit</Text>
    </Box>
  );
}
registerComponent(Menu, {});

function Game({ level }: { level: number }) {
  const { back } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    boundKeyboard(['b'], () => back());
  }, []);

  return (
    <Box>
      <Text>Level {level} — Press B to go back</Text>
    </Box>
  );
}
registerComponent(Game, { level: 1 }, { parent: Menu });

// 2. Wrap with Providers (KeyboardProvider inside ScenarioManagementProvider)
function App() {
  return (
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  );
}

render(
  <ScenarioManagementProvider defaultScreen={Menu}>
    <App />
  </ScenarioManagementProvider>,
);
```

---

## ⚠️ Important: Component Nesting Order

`KeyboardProvider` **must** be nested inside `ScenarioManagementProvider`, because it depends on the screen context to obtain the current screen stack.

```tsx
{/* ❌ Wrong: KeyboardProvider outside screen context */}
<KeyboardProvider>
  <ScenarioManagementProvider defaultScreen={Menu}>
    ...
  </ScenarioManagementProvider>
</KeyboardProvider>

{/* ✅ Correct: KeyboardProvider inside screen context */}
<ScenarioManagementProvider defaultScreen={Menu}>
  <KeyboardProvider>
    ...
  </KeyboardProvider>
</ScenarioManagementProvider>
```

> The screen system can be used independently without `KeyboardProvider`; but the keyboard system requires the screen context.

---

## Concept: Layered Event Handling

Every screen in the tree can have its own **keyboard layer**. When a key is pressed, the event travels through a priority chain:

```
 ① Global keys (affectOverlay: true)
 ② Active overlay layer (if any)
 ③ Global keys (affectOverlay: false, default)
 ④ Screen stack (top → bottom)
 ⑤ Dropped (unhandled)
```

At each layer, three mechanisms control the flow:

| Mechanism     | Description                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| `boundKeyboard` | Bind a key to a handler. If matched, the event is consumed (stops here).  |
| `blockedKey`  | Mark a key as **transparent** — skip this layer's bindings and let the event pass through to the layer below. |
| `stop`        | **Consume** a key even if no local binding matched, preventing it from reaching lower layers. |

---

## API Reference

### `KeyboardProvider`

```tsx
<KeyboardProvider>
  {children}
</KeyboardProvider>
```

Root context provider for the keyboard system. Handles `useInput` from Ink and routes all key events through the layered priority chain.

| Prop       | Type      | Required | Description                          |
| ---------- | --------- | -------- | ------------------------------------ |
| children   | `ReactNode` | Yes    | Child components (usually `App`)     |

**Must be nested inside `<ScenarioManagementProvider>`**.

---

### `useKeyboard`

```tsx
const {
  boundKeyboard,
  blockedKey,
  stop,
  globalKeys,
} = useKeyboard();
```

React hook returning the keyboard API.

**Must be used inside `<KeyboardProvider>`**, otherwise throws an error.

---

### `boundKeyboard`

```tsx
boundKeyboard(keys, handler, options?): () => void;
```

Bind one or more keys to a handler on the **current screen layer**. The binding is automatically associated with the top-of-stack component.

| Parameter | Type                            | Description                                      |
| --------- | ------------------------------- | ------------------------------------------------ |
| keys      | `string[]`                      | Key names to bind (e.g. `['s']`, `['ctrl+q', 'return']`) |
| handler   | `(input: string, key: Key) => void` | Callback matching Ink's `useInput` signature |
| options   | `{ onlyThis?: boolean }`        | Optional behavior flags                         |

**Returns**: An **unbind function** — call it to remove the binding (e.g. in a `useEffect` cleanup).

**Key name format:**

| Example             | Key Pressed                        |
| ------------------- | ---------------------------------- |
| `'s'`               | `s` key                            |
| `'return'`          | Enter/Return                       |
| `'escape'`          | Escape                             |
| `'backspace'`       | Backspace                          |
| `'ctrl+s'`          | Ctrl + S                           |
| `'shift+tab'`       | Shift + Tab                        |
| `'meta+f'`          | Meta/Command + F                   |
| `'up'`              | Up arrow                           |
| `'down'`            | Down arrow                         |

**`onlyThis` option**

When `true`, the binding only activates when the owning screen is the **top-of-stack** and **no overlay is open**. If an overlay is active or the screen is not the top, the binding is skipped and the key bubbles down.

```tsx
// Only works when Combat is the active screen (no overlay on top)
boundKeyboard(['a'], attackHandler, { onlyThis: true });
```

---

### `blockedKey`

```tsx
blockedKey(keys: string[]): void;
```

Mark one or more keys as **transparent** on the current layer. When a transparent key reaches this layer, the layer's own bindings are **skipped** and the key continues to propagate to layers below. Use this to let a lower layer handle a key without interference from the current layer.

```tsx
// In Combat screen: let 'e' pass through to Menu's global 'e' handler
blockedKey(['e']);
```

**Note**: Unlike `boundKeyboard` and `stop`, `blockedKey` does **not** return an unbind function. The transparency is automatically cleaned up when the layer is destroyed (when navigating away from the screen).

---

### `stop`

```tsx
stop(keys: string[]): () => void;
```

Prevent one or more keys from propagating to layers below. The stopped keys are "consumed" at the current layer — they do **not** reach any lower layer. The current layer's own bindings are still evaluated before the stop takes effect, so local bindings work normally.

| Parameter | Type       | Description                |
| --------- | ---------- | -------------------------- |
| keys      | `string[]` | Key names to stop          |

**Returns**: An **unstop function** — call it to remove the keys from the stop list.

```tsx
// In Game screen: stop 'q' from reaching Menu's quit handler
const unstop = stop(['q']);
boundKeyboard(['b'], () => back());

// Clean up when leaving the screen
return () => unstop();
```

**Use case**: Prevent accidental activation of background-layer handlers — e.g. preventing `q` from triggering a "quit" action in the menu while the user is in-game.

---

### `globalKeys`

```tsx
globalKeys(entries: GlobalKeyEntry[]): void;
```

Register **global key bindings** that fire independently of the screen stack. Calling this replaces any previously registered global keys.

```tsx
globalKeys([
  {
    key: 'e',
    operate: () => console.log('Global E pressed'),
    cover: true,
  },
  {
    key: 'q',
    operate: () => process.exit(),
    cover: false,
  },
]);
```

#### `GlobalKeyEntry`

| Property      | Type                                      | Default        | Description |
| ------------- | ----------------------------------------- | -------------- | ----------- |
| `key`         | `string \| string[]`                      | —              | Key name(s) to match (same format as `boundKeyboard`). |
| `operate`     | `() => void`                              | —              | Callback invoked when the key is pressed. |
| `cover`       | `boolean`                                 | `true`         | Whether screen components are allowed to override this global key via `boundKeyboard`. When `false`, calling `boundKeyboard` with the same key in a matching category screen will **throw a runtime error**. |
| `affectOverlay` | `boolean`                               | `false`        | Whether this global key fires **before** the overlay layer (`true`) or **after** it (`false`). |
| `category`    | `React.ComponentType[] \| '*' \| undefined` | `'*'`       | Whitelist of screen components that may use this global key. `'*'` or omitted = all screens; `[]` = effectively disabled; `[Menu, Game]` = only when the stack top is Menu or Game. |

#### Event Placement

- **`affectOverlay: false` (default)**: Overlay → global key → screen stack
- **`affectOverlay: true`**: Global key → overlay → screen stack

#### `cover` Behavior

When `cover: true` (default), a screen can override the global key by calling `boundKeyboard` with the same key name. The screen's binding takes precedence over the global key.

```tsx
// Global key 'e' with cover: true
globalKeys([{ key: 'e', operate: () => console.log('global e'), cover: true }]);

// Screen can override 'e' locally:
boundKeyboard(['e'], () => console.log('local e')); // ✅ OK
```

When `cover: false`, the global key **cannot** be overridden. Attempting to bind the same key via `boundKeyboard` in a matching category screen will throw:

```tsx
// Global key 'e' with cover: false
globalKeys([{ key: 'e', operate: () => console.log('global e'), cover: false }]);

// Screen cannot override:
boundKeyboard(['e'], () => console.log('local e')); // ❌ Throws error
```

---

## Complete Event Chain

```
Key pressed
    │
    ├─ ① Global keys (affectOverlay: true)
    │      └─ matched → consume, stop
    │
    ├─ ② Active overlay layer
    │      ├─ blockedKey? → skip overlay bindings
    │      ├─ boundKeyboard matched? → consume, stop
    │      └─ stop keys matched? → consume, block
    │
    ├─ ③ Global keys (affectOverlay: false, default)
    │      └─ matched → consume, stop
    │
    ├─ ④ Screen stack (top → bottom)
    │      for each layer (top to bottom):
    │        ├─ blockedKey? → skip bindings, continue to next layer
    │        ├─ boundKeyboard matched? → consume, stop
    │        └─ (top layer only) stop keys matched? → consume, block
    │
    └─ ⑤ Dropped (no handler matched)
```

---

## Type Safety

All keyboard APIs provide full TypeScript type inference.

```tsx
// Key names are plain strings (no enum needed)
boundKeyboard(['ctrl+s'], handler);

// GlobalKeyEntry is fully typed
globalKeys([
  {
    key: 'e',
    operate: () => console.log('global e'),
    cover: true,
    affectOverlay: false,
    category: [Menu, Settings],
  },
]);
```

---

## Common Patterns

### Per-Screen Key Binding (Recommended)

Use `useEffect` to set up bindings when the screen mounts and clean them up on unmount.

```tsx
function Game() {
  const { back } = useScreenSystem();
  const { boundKeyboard, stop } = useKeyboard();

  useEffect(() => {
    const unbindB = boundKeyboard(['b'], () => back());
    const unstopQ = stop(['q']);  // prevent q from bubbling to Menu
    return () => {
      unbindB();
      unstopQ();
    };
  }, []);

  return <Text>Playing...</Text>;
}
```

### Blocking Keys for Pass-Through

Let a specific key "pierce" through the current layer to reach a lower layer.

```tsx
function Combat() {
  const { boundKeyboard, blockedKey } = useKeyboard();

  useEffect(() => {
    blockedKey(['e']);  // 'e' passes through to Menu
    boundKeyboard(['a'], () => attack());
  }, []);

  return <Text>Combat! Press A to attack.</Text>;
}
```

### Global Keys for Application-Wide Shortcuts

```tsx
function App() {
  const { globalKeys } = useKeyboard();

  useEffect(() => {
    globalKeys([
      {
        key: 'q',
        operate: () => process.exit(),
        cover: false,
      },
      {
        key: 'h',
        operate: () => showHelp(),
        cover: true,
        affectOverlay: true,  // works even with an overlay open
        category: '*',
      },
    ]);
  }, []);

  return <CurrentScreen />;
}
```

### Override a Global Key in a Specific Screen

```tsx
// Global: 'e' is an exit key (cover: true, so it can be overridden)
globalKeys([{ key: 'e', operate: () => exitGame(), cover: true }]);

// In Settings screen: 'e' does something else
function Settings() {
  const { boundKeyboard } = useKeyboard();
  useEffect(() => {
    boundKeyboard(['e'], () => console.log('Settings: e pressed'));
  }, []);
  // This overrides the global 'e' while Settings is active
}
```

---

## Common Errors

| Error Message                                                              | Cause                                                    |
| -------------------------------------------------------------------------- | -------------------------------------------------------- |
| `[Ink-Trc] useKeyboard() 必须在 <KeyboardProvider> 内部使用。`              | `useKeyboard` was called outside a `<KeyboardProvider>`. |
| `[Ink-Trc] boundKeyboard() 必须在屏幕组件内调用。当前无活跃屏幕。`         | `boundKeyboard` was called when the screen stack is empty. |
| `[Ink-Trc] stop() 必须在屏幕组件内调用。`                                  | `stop` was called outside a screen component.            |
| `[Ink-Trc] blockedKey() 必须在屏幕组件内调用。`                            | `blockedKey` was called outside a screen component.      |
| `[Ink-Trc] 组件 "X" 尝试通过 boundKeyboard 绑定 "Y"，但该键已被 globalKeys 声明且 cover: false，不允许覆盖。` | A screen tried to bind a key that a global key declared as non-overridable (`cover: false`). |