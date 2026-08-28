# Learning how to deactivate and activate keyboard response of elements inside modal layers

In the previous chapter, we learned how keyboard events behave among modal layers. In this chapter, we'll learn how to control the keyboard reception of a single element inside a modal layer: set the initial state with the `active` field of `applyElementToModalLayer`, then toggle it at runtime with `activateElementInModalLayer` / `deactivateElementInModalLayer`.

## The keyboard-reception state of an element inside a modal layer

Elements inside a modal layer follow the same rules as elements inside an ordinary layer: each element has a keyboard-reception state (`active`). When `active`, the element's bindings participate in keyboard dispatch; when paused (`active: false`), the element keeps rendering but no longer receives keyboard events.

The difference comes from the nature of modal layers: **even when a modal layer has no active elements at all, its keyboard barrier still exists** — unhandled keys are still swallowed and don't leak to the ordinary layers or the screen below. Pausing an element inside a modal layer only makes that element stop responding; it doesn't let keys penetrate the modal layer.

The initial reception state is set by the `active` field of `applyElementToModalLayer`; toggling it at runtime is done with `deactivateElementInModalLayer` / `activateElementInModalLayer`.

## Setting the initial state with the `active` field

The element config of `applyElementToModalLayer` is the same as `applyElement`; the `active` field controls the element's initial reception state after mounting and defaults to `true`:

```tsx
applyElementToModalLayer('confirm', {
  element: ElementA,
  elementId: 'element-a',
  active: false, // paused from mount; the element still renders
});
```

## Toggling with `deactivateElementInModalLayer` / `activateElementInModalLayer`

The two methods share the same signatures as their ordinary-layer counterparts, pausing and resuming an element inside a modal layer respectively:

```typescript
deactivateElementInModalLayer(targetModalLayerId: string, targetElementId: string): void
activateElementInModalLayer(targetModalLayerId: string, targetElementId: string): void
```

While a modal layer is open, keys on the screen are blocked by the barrier, so pause and resume must be triggered by an element **inside** the modal layer. The example below mounts two elements in the same modal layer: `ElementA` binds `w` to count and is the element being controlled; `ElementB` uses `d` / `e` to pause and resume `ElementA`.

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
  const { openModalLayer, applyElementToModalLayer } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    // Press 1 to open the modal layer and mount two elements
    return boundKeyboard('1', () => {
      openModalLayer('confirm', 100);
      applyElementToModalLayer('confirm', {
        element: ElementA,
        elementId: 'element-a',
      });
      applyElementToModalLayer('confirm', {
        element: ElementB,
        elementId: 'element-b',
      });
    });
  }, [boundKeyboard, openModalLayer, applyElementToModalLayer]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>Press 1 to open the modal layer</Text>
    </Box>
  );
}
registerComponent(Home, {});

// ElementA is the controlled element; it binds w to count
function ElementA() {
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
      width={40}
      height={5}
      borderStyle="single"
      borderColor="cyan"
      backgroundColor="black"
    >
      <Text>🅰️ Element A · w x{count}</Text>
    </Box>
  );
}

// ElementB is the controlling element; it uses d / e to pause and resume ElementA
function ElementB() {
  const {
    closeModalLayer,
    deactivateElementInModalLayer,
    activateElementInModalLayer,
  } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    const deactivate = boundKeyboard('d', () => {
      deactivateElementInModalLayer('confirm', 'element-a');
    });
    const activate = boundKeyboard('e', () => {
      activateElementInModalLayer('confirm', 'element-a');
    });
    const close = boundKeyboard('q', () => closeModalLayer('confirm'));
    return () => {
      deactivate();
      activate();
      close();
    };
  }, [boundKeyboard, closeModalLayer, deactivateElementInModalLayer, activateElementInModalLayer]);

  return (
    <Box
      position="absolute"
      top={8}
      left={30}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="green"
      backgroundColor="black"
    >
      <Text>🅱️ Element B · d pauses A · e resumes A · q closes</Text>
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

After pressing `1` to open the modal layer:

- Press `w` → `ElementA`'s counter goes up by one; the element responds normally;
- Press `d` to pause `ElementA` — it **still shows**, but pressing `w` no longer changes the counter;
- Press `e` to resume `ElementA`; `w` counts again;
- Press `q` to close the modal layer.

Worth noting: a paused element receives no keys, so it can't wake itself up with its own bindings — `activateElementInModalLayer` must be called by another element inside the modal layer.

## Summary

| Tool | Purpose |
| --- | --- |
| `applyElementToModalLayer`'s `active` field | Sets the initial keyboard-reception state of an element inside a modal layer after mounting (defaults to `true`) |
| `deactivateElementInModalLayer(modalLayerId, elementId)` | Pauses the element's keyboard reception; the element still renders |
| `activateElementInModalLayer(modalLayerId, elementId)` | Resumes the element's keyboard reception |

## Caveats

1. **Pausing is not unmounting.** A paused element keeps rendering and its keyboard registration data stays intact, so `activateElementInModalLayer` can restore it directly.
2. **A paused element receives no keys.** It can't wake itself up — `activateElementInModalLayer` must be called by another element inside the modal layer (the screen is blocked by the barrier while a modal layer is open, so it's usually another element that does it).
3. **`active` only affects keyboard, not rendering.** A paused element keeps displaying; it just stops responding to keys.
4. **A modal layer's keyboard barrier doesn't disappear when its elements are paused.** Even if every element in the modal layer is paused, unhandled keys are still swallowed and don't leak to the UI below.
5. **An element removed by `eraseElementInModalLayer` can't be revived.** Restoring it requires `applyElementToModalLayer` again.

## Next steps

- Use `allowModal` to let keys pass through the modal barrier: [passing keys through with allowModal](/screen/allow-modal)
