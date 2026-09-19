# Shortcuts & Actions

In the *Basic Binding* chapter we mentioned that `boundKeyboard` has three overloads, and only covered the most basic one. This chapter covers the remaining two, along with the supporting **action system**. As for the multi-key **sequence** `boundSequence`, we'll leave that for a dedicated later chapter.

The core idea behind the action system is simple: **fully decouple "which key is pressed" from "which callback runs"**. You first register a set of callbacks as *actions*, then bind keys by action id — changing a keybinding never touches the callback, and changing a callback never touches its bindings.

## Feature preview

| Method | Description |
|------|------|
| `boundKeyboard(keys, handler, options?)` | Basic form: explicit keys + callback (covered in *Basic Binding*) |
| `boundKeyboard(actionId, options?)` | Bind an action using its **preset keys** |
| `boundKeyboard(keys, actionId, options?)` | Bind an action using **explicit keys** (overrides preset keys) |
| `defineShortcutAction` / `addAction` | Register shortcut actions |
| `hasAction` / `removeAction` / `modifyAction` | Query / remove / modify shortcut actions |

## The action system

A shortcut action is a `ShortcutOperationEntry`:

```typescript
type ShortcutOperationEntry = {
  actionId: string        // unique id — binding and triggering both use it
  action: () => void      // the callback invoked when the action fires
  keys?: string[]         // preset keys, optional
}
```

Register several at once with `defineShortcutAction` (duplicate `actionId`s throw); `addAction` registers one at a time:

```tsx
const { defineShortcutAction, addAction } = useKeyboard()

// Register two actions at once
defineShortcutAction([
  { actionId: "save", action: () => save(), keys: ["s"] },
  { actionId: "reset", action: () => reset(), keys: ["r"] },
])

// Add another one, one at a time
addAction({ actionId: "quit", action: () => process.exit(0) })
```

Companion query and maintenance methods:

- `hasAction(actionId)` — whether the action is registered;
- `removeAction(actionId)` — remove the action; throws if it isn't registered;
- `modifyAction(actionId, keys)` — change the action's preset keys. The action must be registered and must have been registered with a `keys` field, otherwise it throws.

> Note: `modifyAction` changes the preset keys in the registry, which only affects bindings created by **later** `boundKeyboard(actionId)` calls — existing bindings are untouched. The registry is **per engine instance**: what you get through `useKeyboard()` belongs to the current `KeyboardProvider`.

## The three `boundKeyboard` overloads

The basic form `boundKeyboard(keys, handler, options?)` was covered in *Basic Binding*; here we focus on the two action overloads.

### Action-id form: `boundKeyboard(actionId, options?)`

Binds using the action's **preset keys**:

```tsx
// save's preset keys are ["s"], so this binds the s key
boundKeyboard("save")
```

Pressing `s` runs the `save` action's callback.

### Explicit keys + action id: `boundKeyboard(keys, actionId, options?)`

Binds using **explicit keys**, overriding the preset keys:

```tsx
// whatever save's preset keys are, this binds x
boundKeyboard(["x"], "save")
```

Two rules worth remembering:

- **`boundKeyboard(actionId)` requires the action to have been registered with a `keys` field**, otherwise it throws `does not have predefined keys`; `boundKeyboard(keys, actionId)` doesn't depend on preset keys — an action without preset keys can only be bound this way.
- **Both forms throw when the `actionId` isn't registered**:
  ```
  [keyboard-engine] Action "save" is not registered.
  ```

> Tip: treat preset keys as an action's **default keybinding** — good for common actions. For aliases or dynamic keybindings, use the explicit-keys form; the two coexist without interfering.

## Complete example

By now we can tie the action system and the three overloads into a **fully runnable** app — a "shortcut console": the left panel lists the registered actions, the right panel is a live event log. `save` is triggered by both `s` and `x`, and `toggle` deliberately has no preset keys, so it can only be bound with explicit keys. Save the code below as a `.tsx` file and run `npx tsx <file-name>.tsx`.

::: details Click to expand the full example (~120 lines)
```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, render } from 'ink';
import {
  CurrentScreen,
  KeyboardProvider,
  ScenarioManagementProvider,
  registerComponent,
  useKeyboard,
} from 'ink-cartridge';

function ConsoleScreen() {
  const {
    boundKeyboard,
    defineShortcutAction,
    hasAction,
  } = useKeyboard();
  const [log, setLog] = useState<string[]>([]);

  // Stable append helper, used directly inside action callbacks
  const push = useCallback((msg: string) => {
    setLog((prev) => [msg, ...prev].slice(0, 6));
  }, []);

  useEffect(() => {
    // Register shortcut actions (idempotent: skip if already registered)
    if (!hasAction('save')) {
      defineShortcutAction([
        { actionId: 'save', action: () => push('save (s)'), keys: ['s'] },
        { actionId: 'reset', action: () => push('reset (r)'), keys: ['r'] },
        { actionId: 'toggle', action: () => push('toggle (t)') },  // no preset keys
      ]);
    }

    // Overload 2: action id + preset keys
    const unSave = boundKeyboard('save');
    const unReset = boundKeyboard('reset');
    // Overload 3: explicit keys + action id (overrides preset keys)
    const unSaveAlias = boundKeyboard(['x'], 'save');
    // Overload 3: explicit keys + action id (an action with no preset keys)
    const unToggle = boundKeyboard(['t'], 'toggle');

    return () => {
      unSave(); unReset(); unSaveAlias(); unToggle();
    };
  }, [boundKeyboard, defineShortcutAction, hasAction, push]);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title bar */}
      <Box borderStyle="single" borderColor="cyan" paddingX={2}>
        <Text bold color="cyan">SHORTCUT & ACTION CONSOLE</Text>
        <Text dimColor>  ·  shortcut actions & boundKeyboard overloads</Text>
      </Box>

      {/* Two-column body: action list + event log */}
      <Box flexDirection="row" gap={1} marginTop={1}>
        {/* Left: registered actions */}
        <Box width={30} borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1} paddingY={1}>
          <Text bold underline color="cyan">Registered actions</Text>
          <Box flexDirection="column" marginTop={1} gap={0}>
            <Text>▶ [s] save</Text>
            <Text dimColor>  [x] save (explicit keys)</Text>
            <Text dimColor>  [r] reset</Text>
            <Text dimColor>  [t] toggle (no preset keys)</Text>
          </Box>
        </Box>

        {/* Right: event log */}
        <Box flexGrow={1} borderStyle="round" borderColor="magenta" flexDirection="column" paddingX={1} paddingY={1}>
          <Text bold underline color="magenta">Event log</Text>
          <Box flexDirection="column" marginTop={1} gap={0}>
            {log.length === 0 && <Text dimColor>（no events yet）</Text>}
            {log.map((line, i) => (
              <Text key={i} color={i === 0 ? 'green' : undefined}>· {line}</Text>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Bottom bar: key hints */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={2}>
        <Text dimColor>
          s/x save · r reset · t toggle · q quit
        </Text>
      </Box>
    </Box>
  );
}

registerComponent(ConsoleScreen, {});

function App() {
  const { boundKeyboard } = useKeyboard();
  useEffect(() => {
    return boundKeyboard(['q'], () => process.exit(0));
  }, [boundKeyboard]);
  return <CurrentScreen />;
}
registerComponent(App, {});

render(
  <ScenarioManagementProvider defaultScreen={ConsoleScreen} fullScreen>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
```
:::

### Controls

| Key | Effect | Trigger |
|------|------|----------|
| `s` | save | action id + preset keys |
| `x` | save | explicit keys + action id (overrides preset keys) |
| `r` | reset | action id + preset keys |
| `t` | toggle | explicit keys + action id (action has no preset keys) |
| `q` | quit | basic form `boundKeyboard(keys, handler)` |

### What you should observe

1. **Callbacks are decoupled from keys**: `save` registers its callback once, yet fires from both `s` (preset keys) and `x` (explicit keys) — changing a keybinding never touches the callback.

2. **Preset keys aren't required**: `toggle` was registered without a `keys` field, so `boundKeyboard('toggle')` would throw; the code binds it with explicit keys via `boundKeyboard(['t'], 'toggle')` and it works.

3. **The registry is independent**: an action is registered once and can be referenced by many keys and bindings; `hasAction` queries, `removeAction` removes, and `modifyAction` changes preset keys (only affecting later bindings).
