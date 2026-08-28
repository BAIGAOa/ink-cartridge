# Learning how keyboard events behave in modal layers

In the previous chapter, we learned the basics of modal layers and their methods. In this chapter, we'll learn how keyboard events flow among modal layers: why only the topmost modal layer receives keys, and why the rest of the UI seems "dead" while a modal layer is open.

## Where modal layers sit in the keyboard pipeline

In the ordinary-layer chapter we mentioned that a keyboard event passes through a fixed processing pipeline. The modal-layer stage sits at the **very front** of that pipeline with the highest priority — it receives the event before global keys, ordinary layers, and the screen stack.

The modal-layer stage can be summarized in three rules:

1. **Only the modal layer with the highest `zIndex` receives keyboard events**;
2. After the top modal layer receives an event, it **broadcasts** it to every active element inside it (same as ordinary layers);
3. Keys not handled by the top modal layer are **swallowed by the barrier** — they don't fall through to the ordinary layers or the screen below.

Rules 1 and 3 are what fundamentally set modal layers apart from ordinary layers. We'll expand on each below.

## Only the modal layer with the highest `zIndex` receives keyboard events

First, remember the core rule: **when several modal layers are open at once, only the one with the highest `zIndex` receives keyboard events — every other modal layer is dormant**, receiving no keys at all. When the topmost modal layer closes, the next one takes over the keyboard.

Here's a minimal runnable example: press `1` to open the first modal layer, press `2` inside it to open another modal layer with a higher `zIndex`, and watch which one receives `return`.

```tsx
import React, { useContext, useEffect, useState } from 'react';
import { Box, Text, render } from 'ink';
import {
  CurrentScreen,
  KeyboardProvider,
  ModalLayerElementContext,
  ScenarioManagementProvider,
  registerComponent,
  useKeyboard,
  useScreenSystem,
} from 'ink-cartridge';

function Home() {
  const { openModalLayer, applyElementToModalLayer } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    // Press 1 to open the first modal layer
    return boundKeyboard('1', () => {
      openModalLayer('modal-1', 100);
      applyElementToModalLayer('modal-1', {
        element: ModalOne,
        elementId: 'm1',
      });
    });
  }, [boundKeyboard, openModalLayer, applyElementToModalLayer]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>Press 1 to open the first modal, press 2 inside it to open another</Text>
    </Box>
  );
}
registerComponent(Home, {});

function ModalOne() {
  const { closeModalLayer, openModalLayer, applyElementToModalLayer } =
    useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const ctx = useContext(ModalLayerElementContext);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!ctx) return;
    // Press 2 inside this modal to open another modal with a higher zIndex
    const open2 = boundKeyboard('2', () => {
      openModalLayer('modal-2', 200);
      applyElementToModalLayer('modal-2', {
        element: ModalTwo,
        elementId: 'm2',
      });
    });
    const countReturn = boundKeyboard('return', () => setCount((n) => n + 1));
    const close = boundKeyboard('q', () => closeModalLayer('modal-1'));
    return () => {
      open2();
      countReturn();
      close();
    };
  }, [boundKeyboard, closeModalLayer, openModalLayer, applyElementToModalLayer, ctx]);

  return (
    <Box
      position="absolute"
      top={4}
      left={30}
      width={40}
      height={6}
      borderStyle="round"
      borderColor="blue"
      backgroundColor="black"
    >
      <Text>🔵 Modal 1 (z=100) · return x{count} · 2 opens another · q closes</Text>
    </Box>
  );
}

function ModalTwo() {
  const { closeModalLayer } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const ctx = useContext(ModalLayerElementContext);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!ctx) return;
    const countReturn = boundKeyboard('return', () => setCount((n) => n + 1));
    const close = boundKeyboard('q', () => closeModalLayer('modal-2'));
    return () => {
      countReturn();
      close();
    };
  }, [boundKeyboard, closeModalLayer, ctx]);

  return (
    <Box
      position="absolute"
      top={4}
      left={74}
      width={40}
      height={6}
      borderStyle="round"
      borderColor="magenta"
      backgroundColor="black"
    >
      <Text>🟣 Modal 2 (z=200) · return x{count} · q closes</Text>
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

- Press `1` to open `modal-1` (z=100), then press `2` to open `modal-2` (z=200) — now `modal-2` is the topmost modal layer;
- Press `return`: the event is handed only to `modal-2`, and `ModalTwo`'s counter goes up by one; even though `modal-1` is open too, it receives no keys and its counter stays at 0;
- Press `q` to close `modal-2`, and `modal-1` becomes the topmost modal layer again — pressing `return` now increments `ModalOne`'s counter;
- Press `q` again to close `modal-1`; only after all modal layers are closed does the Home screen respond again.

That's the rule among modal layers: **the keyboard is always handed to the single topmost modal layer, the rest stay dormant; when the topmost closes, the next one takes over**.

## The keyboard barrier of modal layers

Modal layers also have a trait ordinary layers don't: the **keyboard barrier**. While a modal layer is open, keys it doesn't handle don't fall through to the ordinary layers or the screen below — they're swallowed outright.

Remember the ordinary-layer rule? A key missed by ordinary layers keeps **bubbling** and finally **falls back to the screen stack** — handed to the current screen. Modal layers are the opposite: as long as a modal layer is open, an unhandled key stops right there and never leaks downward.

You already saw this in the example above: once `modal-1` is open, the `1` key on the Home screen stops responding — `modal-1` doesn't handle `1`, but the key is swallowed by the barrier and never reaches Home.

> **Note:** The barrier isn't absolute. You can use `allowModal` to let specific keys "pass through" the barrier so they reach the layers or screen below. That's a mechanism unique to modal layers, covered in a later chapter.

## Summary

| Rule | Description |
| --- | --- |
| **Highest priority** | The modal-layer stage sits at the very front of the keyboard processing pipeline |
| **Only the topmost receives keys** | Only the modal layer with the highest `zIndex` receives keyboard events |
| **Broadcast within the top layer** | The top modal layer broadcasts the event to every active element inside it |
| **The rest stay dormant** | Non-topmost modal layers receive no keys; the next one takes over when the topmost closes |
| **Keyboard barrier** | Keys not handled by the modal layer are swallowed; they don't reach the ordinary layers or the screen |

## Caveats

1. **The modal-layer stage sits at the very front of the pipeline.** It processes events before global keys, ordinary layers, and the screen stack, so a modal layer's keys naturally have the highest priority.
2. **Only the modal layer with the highest `zIndex` receives keys.** When several modal layers coexist, the rest stay dormant until the topmost one closes.
3. **The top modal layer broadcasts within itself.** Just like ordinary layers, the event is broadcast to every active element in the top modal layer, so multiple handlers can respond at once.
4. **The barrier swallows unhandled keys.** While a modal layer is open, unhandled keys don't bubble to the ordinary layers or the screen; use `allowModal` to let them through (covered in a later article).

## Next steps

- Learn how to deactivate and activate keyboard response of elements inside modal layers: [keyboard response of modal layer elements](/screen/modal-layer-element-keyboard)
