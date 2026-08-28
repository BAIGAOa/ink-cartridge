# Learning how to control keyboard reception of a layer element

In the previous chapter, we learned how keyboard events behave between layers. In this chapter, we'll learn how to control the keyboard reception of a **single element** inside a layer.

## The keyboard-reception state of an element

Let's start with a question: **without runtime `active` control, how would you make a layer element temporarily stop responding to keys?**

Imagine a tool panel with a button bound to a key. In some states you want that button to be temporarily inert — pressing it does nothing, but the UI stays. Without `active` control, the only thing you can do is `eraseElement` it away and `applyElement` it back once the condition is met. But that discards the element's own state (counters, selection, etc.) along with the unmount — a heavy price.

ink-cartridge offers a lighter approach: **every element mounted into a layer has a keyboard-reception state (`active`)**. When `active` is `false`, the element keeps rendering but stops receiving keyboard events; once the condition is met, flip it back to `true` and the state is preserved as-is.

Before we dive in, one key fact: **pausing an element's keyboard reception does not unmount it**. A paused element stays mounted in the layer and keeps rendering; the keyboard engine just stops dispatching events to it. Its registration data (such as `boundKeyboard` bindings) stays intact, ready to be restored at any time.

The initial reception state is set by the `active` field of `applyElement`; toggling it at runtime is done with `deactivateElement` / `activateElement`. We'll cover each below.

## Setting the initial state with the `active` field

The element config of `applyElement` has an `active` field that controls the element's initial reception state after mounting. It defaults to `true`:

```tsx
applyElement('tool-panel', {
  element: ToolPanel,
  elementId: 'tool-panel-body',
  active: false, // paused from mount; the element still renders
});
```

An element with `active: false` doesn't receive keyboard events from the moment it mounts, but still renders. It suits "show first, respond later" scenarios — activate it from other code once the condition is met.

## Toggling with `deactivateElement` / `activateElement`

The two methods share the same signature and pause / resume an element respectively:

```typescript
deactivateElement(targetLayerId: string, targetElementId: string): void
activateElement(targetLayerId: string, targetElementId: string): void
```

- `targetLayerId` — the ID of the layer the element lives in;
- `targetElementId` — the ID of the element to toggle.

Here's a minimal runnable example: press `a` to open the tool panel; the panel element binds `w` to count. Home also binds `d` to pause and `e` to resume this element's keyboard reception.

```tsx
import React, { useEffect, useState } from 'react';
import { Box, Text, render } from 'ink';
import {
  CurrentScreen,
  KeyboardProvider,
  ScenarioManagementProvider,
  registerComponent,
  useKeyboard,
  useScreenSystem,
} from 'ink-cartridge';

function Home() {
  const { openLayer, applyElement, activateElement, deactivateElement } =
    useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    const open = boundKeyboard('a', () => {
      openLayer('tool-panel', 10);
      applyElement('tool-panel', {
        element: ToolPanel,
        elementId: 'tool-panel-body',
      });
    });
    const deactivate = boundKeyboard('d', () => {
      deactivateElement('tool-panel', 'tool-panel-body');
    });
    const activate = boundKeyboard('e', () => {
      activateElement('tool-panel', 'tool-panel-body');
    });
    return () => {
      open();
      deactivate();
      activate();
    };
  }, [boundKeyboard, openLayer, applyElement, activateElement, deactivateElement]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>Press a to open the panel · w to count · d to pause the element · e to resume</Text>
    </Box>
  );
}
registerComponent(Home, {});

function ToolPanel() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('w', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={30}
      width={30}
      height={8}
      borderStyle="bold"
      borderColor="yellow"
      backgroundColor="black"
    >
      <Text>🧰 Tool Panel (w x{count})</Text>
    </Box>
  );
}

render(
  <ScenarioManagementProvider defaultScreen={Home} fullScreen>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>
);
```

Run it:

- Press `a` to open the panel, press `w` → count +1, the element responds normally;
- Press `d` to pause `tool-panel-body` — the panel **still shows**, but pressing `w` no longer changes the count — the element no longer receives keyboard events;
- Press `e` to resume; `w` counts again, and the previous count is preserved.

Worth noting: **a paused element can't wake itself up with its own keys**. Since it no longer receives any keys, restoring it must come from another element or the screen — like the `e` binding on Home in the example.

## Summary

| Tool | Purpose |
| --- | --- |
| `applyElement`'s `active` field | Sets the element's initial keyboard-reception state after mounting (defaults to `true`) |
| `deactivateElement(layerId, elementId)` | Pauses the element's keyboard reception; the element still renders |
| `activateElement(layerId, elementId)` | Resumes the element's keyboard reception |

## Caveats

1. **Pausing is not unmounting.** `deactivateElement` only pauses the element's keyboard reception; the element still renders, and registration data such as `boundKeyboard` stays intact, so `activateElement` can restore it directly.
2. **A paused element receives no keys.** Therefore it can't "wake itself up" — `activateElement` must be called by another element or the screen.
3. **`active` only affects keyboard, not rendering.** A paused element keeps displaying; it just stops responding to keys.
4. **`activateElement` can't revive an element removed by `eraseElement`.** `eraseElement` destroys the element together with its keyboard registration; restoring requires `applyElement` again.
5. **Modal layers have counterparts**: `activateElementInModalLayer` / `deactivateElementInModalLayer` (covered in a later article).

## Next steps

- Learn the basics of modal layers and their methods: [modal layer basics](/screen/modal-layer-base)
