# Keyboard System

ink-kit provides a **layered keyboard event system** built on top of the screen management tree. Instead of a single global `useInput` with messy `if-else` chains, you get **per-screen-layer** key bindings with transparent keys, propagation barriers, global shortcuts, and **within-screen focus management**.

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
} from '@baigao_h/ink-kit';

function Menu() {
  const { skip } = useScreenSystem();
  const { boundKeyboard, defineShortcutAction } = useKeyboard();

  useEffect(() => {
    // Register named shortcut operations
    defineShortcutAction([
      { actionId: 'start-game', action: () => skip(Game, { level: 1 }) },
      { actionId: 'quit', action: () => process.exit() },
    ]);

    // Bind keys to shortcut IDs instead of inline functions
    boundKeyboard(['s'], 'start-game');
    boundKeyboard(['q'], 'quit');
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

## Important: Component Nesting Order

`KeyboardProvider` **must** be nested inside `ScenarioManagementProvider`, because it depends on the screen context to obtain the current screen stack.

```tsx
{/* Wrong: KeyboardProvider outside screen context */}
<KeyboardProvider>
  <ScenarioManagementProvider defaultScreen={Menu}>
    ...
  </ScenarioManagementProvider>
</KeyboardProvider>

{/* Correct: KeyboardProvider inside screen context */}
<ScenarioManagementProvider defaultScreen={Menu}>
  <KeyboardProvider>
    ...
  </KeyboardProvider>
</ScenarioManagementProvider>
```

The screen system can be used independently without `KeyboardProvider`; but the keyboard system requires the screen context.

---

## Concepts

### Layered Event Handling

Every screen in the tree has its own **keyboard layer**. When a key is pressed, the event travels through a priority chain:

```
Key pressed
  │
  ├─ ① Global keys (affectOverlay: true)
  │
  ├─ ② Active overlay layer
  │      ├─ Built-in Tab/Shift+Tab → switch focus within overlay
  │      ├─ Focus target (if active) → blockedKey → bindings → stop
  │      └─ Overlay layer bindings → blockedKey → bindings → stop
  │
  ├─ ③ Global keys (affectOverlay: false, default)
  │
  ├─ ④ Screen stack (top → bottom)
  │      For each layer (top to bottom):
  │        ├─ Built-in Tab/Shift+Tab (top layer only) → switch focus
  │        ├─ Focus target (top layer only, if active) → blockedKey → bindings → stop
  │        └─ Screen layer bindings → blockedKey → bindings → stop
  │
  └─ ⑤ Dropped (unhandled)
```

### Screen-Level vs Focus-Level

Before the focus system, all bindings within a screen shared the same bucket. Two `SelectInput` components on the same screen would both bind `up`/`down`/`return` and collide. The focus system splits each layer into two tiers:

- **Screen-level bindings**: the original `boundKeyboard` without `focusId`. Always active.
- **Focus targets**: named buckets created by passing `focusId` in `BoundKeyboardOptions`. Only the **currently active** target receives events.

Events always check the active focus target **first**, then fall through to screen-level bindings.

Multiple form controls on the same screen can each own a focus target. The built-in **Tab** key rotates between them automatically.

### Shortcut Actions

Shortcut actions decouple **operation definition** from **key binding**. Instead of passing inline functions to `boundKeyboard`, you register named operations with `defineShortcutAction` and reference them by string ID:

```tsx
// Define the operation once
defineShortcutAction([
  { actionId: 'submit', action: () => console.log('submitted') },
]);

// Bind it anywhere
boundKeyboard(['return'], 'submit');
boundKeyboard(['ctrl+s'], 'submit', { focusId: 'editor' });
```

This makes it possible to reconfigure keys (via JSON) without touching code.

---

## API Reference

### `KeyboardProvider`

```tsx
<KeyboardProvider>
  {children}
</KeyboardProvider>
```

Root context provider for the keyboard system. Handles `useInput` from Ink and routes all key events through the layered priority chain.

Must be nested inside `<ScenarioManagementProvider>`.

---

### `useKeyboard`

```tsx
const {
  boundKeyboard,
  blockedKey,
  stop,
  globalKeys,
  focusSet,
  focusNext,
  focusPrev,
  focusCurrent,
  focusUnregister,
  subscribeFocus,
  defineShortcutAction,
} = useKeyboard();
```

React hook returning the keyboard API.

Must be used inside `<KeyboardProvider>`, otherwise throws an error.

---

### `defineShortcutAction`

```tsx
defineShortcutAction(entries: ShortcutOperationEntry[]): void;
```

Register named shortcut actions that can be referenced by `boundKeyboard` and `globalKeys` using a string identifier instead of an inline callback. Decouples operation definition from key binding.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| entries   | `ShortcutOperationEntry[]` | Array of `{ actionId: string, action: () => void }` |

```tsx
defineShortcutAction([
  { actionId: 'start-game', action: () => skip(Game, {}) },
  { actionId: 'quit', action: () => process.exit() },
  { actionId: 'save', action: () => saveGame() },
]);
```

Shortcut actions can be referenced anywhere string handlers are accepted:

```tsx
// In boundKeyboard
boundKeyboard(['s'], 'start-game');
boundKeyboard(['ctrl+s'], 'save', { focusId: 'editor' });

// In globalKeys
globalKeys([{ key: 'q', operate: 'quit' }]);
```

---

### `useFocusState`

```tsx
const isFocused = useFocusState(focusId: string): boolean;
```

A subscription-based hook that returns `true` when the given `focusId` is the currently active focus target on the current screen. Reactively re-renders on focus changes without causing the whole tree to update.

Used by focus-aware components (SelectInput, TextInput, etc.) to react to focus gain/loss.

---

### `boundKeyboard`

```tsx
boundKeyboard(keys, handler, options?): () => void;
```

Bind one or more keys to a handler. The binding is automatically associated with the top-of-stack component.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| keys      | `string[]` | Key names to bind (e.g. `['s']`, `['ctrl+q', 'return']`) |
| handler   | `(input: string, key: Key) => void` | Callback or shortcut action ID string |
| options   | `{ onlyThis?: boolean; focusId?: string }` | Optional behavior flags |

Returns an unbind function.

The `handler` parameter accepts two forms:
1. **Function** — an inline callback, same as before
2. **String** — an action ID previously registered via `defineShortcutAction`

```tsx
// Inline function
boundKeyboard(['s'], () => skip(Game, {}));

// Shortcut action reference
boundKeyboard(['s'], 'start-game');

// With focus target
boundKeyboard(['ctrl+s'], 'save', { focusId: 'editor' });
```

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

When `true`, the binding only activates when the owning screen is the top-of-stack and no overlay is open.

**`focusId` option**

When provided, the binding is stored on a named **focus target** instead of the screen-level bucket. Only the currently active focus target receives events. Focus targets are created on first use and automatically activated if no other target is currently active.

```tsx
boundKeyboard(['up'], handleUp, { focusId: 'theme-picker' });
boundKeyboard(['down'], handleDown, { focusId: 'theme-picker' });
boundKeyboard(['return'], handleSelect, { focusId: 'theme-picker' });
```

---

### `blockedKey`

```tsx
blockedKey(keys, options?): void;
```

Mark one or more keys as **transparent** on the current layer. When a transparent key reaches this layer, the layer's own bindings are skipped and the key propagates to layers below.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| keys      | `string[]` | Key names to make transparent |
| options   | `{ focusId?: string }` | If provided, blocks only within that focus target |

Does not return an unbind function. Transparency is automatically cleaned up when the layer is destroyed.

---

### `stop`

```tsx
stop(keys, options?): () => void;
```

Prevent one or more keys from propagating to layers below. The stopped keys are consumed at this layer: the layer's own bindings are evaluated first, and if no binding matches, the key is blocked.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| keys      | `string[]` | Key names to stop |
| options   | `{ focusId?: string }` | If provided, stops within that focus target |

Returns an unstop function.

---

### `globalKeys`

```tsx
globalKeys(entries: GlobalKeyEntry[]): void;
```

Register **global key bindings** that fire independently of the screen stack. Calling this replaces any previously registered global keys.

#### `GlobalKeyEntry`

| Property        | Type                                      | Default        | Description |
| --------------- | ----------------------------------------- | -------------- | ----------- |
| `key`           | `string \| string[]`                      | —              | Key name(s) to match |
| `operate`       | `() => void \| string`                    | —              | Callback or shortcut action ID string |
| `cover`         | `boolean`                                 | `true`         | Whether screen components may override this key |
| `affectOverlay` | `boolean`                                 | `false`        | Fire before (`true`) or after (`false`) the overlay layer |
| `category`      | `React.ComponentType[] \| '*' \| undefined` | `'*'`       | Whitelist of screens; `'*'` = all, `[]` = disabled |

The `operate` field supports shortcut action IDs:

```tsx
globalKeys([
  { key: 'q', operate: 'quit' },
  { key: 's', operate: 'start-game', affectOverlay: true },
]);
```

---

### Focus Management APIs

These are available from `useKeyboard()` and operate on the **current screen's** focus targets.

#### `focusSet(focusId: string): void`

Activate a specific focus target by its id. No-op if the id does not exist.

#### `focusNext(): void`

Rotate to the next focus target in registration order. Equivalent to pressing Tab.

#### `focusPrev(): void`

Rotate to the previous focus target in registration order. Equivalent to pressing Shift+Tab.

#### `focusCurrent(): string | null`

Returns the currently active focus id, or `null` if none.

#### `focusUnregister(focusId: string): void`

Remove a focus target. If it was the active one, the next target (if any) is activated automatically. Components should call this in their `useEffect` cleanup.

#### `subscribeFocus(listener: () => void): () => void`

Subscribe to focus changes on the current screen. Returns an unsubscribe function. Used internally by `useFocusState`; you rarely need this directly.

---

## Built-in Tab Navigation

When a screen has one or more focus targets registered, the keyboard system intercepts `tab` and `shift+tab` at the top layer and rotates through targets in registration order.

- **Tab**: activate next focus target
- **Shift+Tab**: activate previous focus target

This is automatic — you do not need to bind Tab yourself. If a screen has no focus targets, Tab keys fall through to screen-level bindings as normal.

The same behavior applies to overlays with focus targets.

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
    const unstopQ = stop(['q']);
    return () => {
      unbindB();
      unstopQ();
    };
  }, []);

  return <Text>Playing...</Text>;
}
```

### Using Shortcut Actions

```tsx
function Menu() {
  const { skip } = useScreenSystem();
  const { boundKeyboard, defineShortcutAction } = useKeyboard();

  useEffect(() => {
    defineShortcutAction([
      { actionId: 'start-game', action: () => skip(Game, {}) },
      { actionId: 'open-settings', action: () => skip(Settings, {}) },
    ]);
    boundKeyboard(['s'], 'start-game');
    boundKeyboard(['c'], 'open-settings');
  }, []);

  return <Text>Main Menu</Text>;
}
```

### Blocking Keys for Pass-Through

Let a specific key "pierce" through the current layer to reach a lower layer.

```tsx
function Combat() {
  const { boundKeyboard, blockedKey } = useKeyboard();

  useEffect(() => {
    blockedKey(['e']);
    boundKeyboard(['a'], () => attack());
  }, []);

  return <Text>Combat! Press A to attack.</Text>;
}
```

### Global Keys with Shortcut Actions

```tsx
function App() {
  const { globalKeys, defineShortcutAction } = useKeyboard();

  useEffect(() => {
    defineShortcutAction([
      { actionId: 'quit', action: () => process.exit() },
      { actionId: 'help', action: () => showHelp() },
    ]);
    globalKeys([
      { key: 'q', operate: 'quit', cover: false },
      { key: 'h', operate: 'help', cover: true, affectOverlay: true, category: '*' },
    ]);
  }, []);

  return <CurrentScreen />;
}
```

### Focus-Aware Component

```tsx
function MySelectInput<T>(props: { focusId: string; items: Item<T>[]; onSelect: (item: Item<T>) => void }) {
  const isFocused = useFocusState(props.focusId);
  const { boundKeyboard, focusUnregister } = useKeyboard();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const fid = props.focusId;
    const u1 = boundKeyboard(['up'], () => setIndex(i => ...), { focusId: fid });
    const u2 = boundKeyboard(['down'], () => setIndex(i => ...), { focusId: fid });
    const u3 = boundKeyboard(['return'], () => props.onSelect(props.items[index]), { focusId: fid });
    return () => { u1(); u2(); u3(); focusUnregister(fid); };
  }, [props.focusId]);

  return (
    <Box flexDirection="column">
      {props.items.map((item, i) => (
        <Text key={String(item.value)} dimColor={!isFocused}>
          {isFocused && i === index ? '❯ ' : '  '}{item.label}
        </Text>
      ))}
    </Box>
  );
}
```

### Multiple Controls on One Screen

```tsx
function Settings() {
  return (
    <Box flexDirection="column">
      <Text bold>Settings</Text>

      <MySelectInput
        focusId="theme-picker"
        items={[{ label: 'Dark', value: 'dark' }, { label: 'Light', value: 'light' }]}
        onSelect={(item) => console.log('theme:', item.value)}
      />

      <MySelectInput
        focusId="difficulty-picker"
        items={[{ label: 'Easy', value: 'easy' }, { label: 'Hard', value: 'hard' }]}
        onSelect={(item) => console.log('difficulty:', item.value)}
      />

      <Text dimColor>Press Tab to switch focus</Text>
    </Box>
  );
}
```

### Programmatic Focus Control

```tsx
function Wizard() {
  const { focusSet, focusNext } = useKeyboard();

  useEffect(() => {
    boundKeyboard(['ctrl+n'], () => focusNext());
    boundKeyboard(['ctrl+1'], () => focusSet('step1'));
    boundKeyboard(['ctrl+2'], () => focusSet('step2'));
  }, []);

  // ...
}
```

---

## Complete Event Chain

```
Key pressed
    │ ├─ ① keys (affectlay: true)
      └─ → consume, stop
    ├─ ② Active overlay layer
    │      ├─ Built-in Tab/Shift+Tab → switch focus within overlay
    │      ├─ Focus target (if active)
    │      │    ├─ blockedKey → skip bindings
    │      │    ├─ boundKeyboard matched? → consume, stop
    │      │    └─ stop keys matched? → consume, block
    │      ├─ Overlay layer bindings
    │      │    ├─ blockedKey → skip bindings
    │      │    ├─ boundKeyboard matched? → consume, stop
    │      │ └─ stop keys matched? → consume, block │      └─ (none matched) → continue
    │
 ③ Global keys (ectOverlay: false, default)
    │      └─ matched → consume, stop
    │
    ├─ ④ Screen stack (top → bottom)
    │      for each layer (top to bottom):
    │        ├─ Built-in Tab/Shift+Tab (top layer only) → switch focus
    │        ├─ Focus target (top layer only, if active)
    │        │    ├─ blockedKey → skip bindings
    │        │    ├─ boundKeyboard matched? → consume, stop
    │        │    └─ stop keys matched? → consume, block
    │        ├─ Screen layer bindings
    │        │    ├─ blockedKey → skip bindings
    │        │    ├─ boundKeyboard matched? → consume, stop
    │        │    └─ (top layer only) stop keys matched? → consume, block
    │        └─ (none matched) → continue to next layer
    │
    └─ ⑤ Dropped (no handler matched)
```

