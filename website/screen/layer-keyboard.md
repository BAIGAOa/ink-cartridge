# Learning how keyboard events behave between layers

In the previous chapter we learned the basic layer concepts and the related methods. In this chapter, we'll learn how keyboard events behave between layers.

## What is a keyboard event

A **keyboard event** is the input produced when the user presses a key on the terminal. In ink-cartridge, every keyboard event is captured and dispatched centrally by the keyboard engine (`KeyboardEngine`) — you don't attach a separate listener per key. Instead you declare "what to do when a certain key is pressed" with `boundKeyboard`, and the engine decides which handler the event finally goes to.

When a key is pressed, Ink captures the raw input via `useInput`, and the keyboard engine **normalizes** it into a standard key name: a plain character is itself (`'s'`, `'1'`), a modifier combo is joined with `+` (`'ctrl+q'`), and special keys have fixed names (`'escape'`, `'return'`, `'tab'`):

```tsx
boundKeyboard('s', () => handleSelect());      // plain character
boundKeyboard('ctrl+q', () => handleQuit());   // modifier combo
boundKeyboard('escape', () => handleCancel()); // special key
```

After normalization, the event enters a fixed **processing pipeline**: modal layers, global keys and sequences, the layer stage, and finally the screen stack. The moment a stage consumes the event, processing stops and the event goes no further. The layer stage sits between the global mechanisms and the screen stack — it is the protagonist of this chapter: **how keyboard events flow from one layer to another**.

### A layer is an "owner" of keyboard events

Before we dive in, one key fact: **a layer is not just a visual overlay — it is also an "owner" of keyboard events**. Elements mounted into a layer register keyboard bindings with `boundKeyboard`, and those bindings belong to the layer the element lives in. When you get `boundKeyboard` from `useKeyboard()`, it has already read the current element's `elementId` from `LayerElementContext` and injected it automatically — you usually don't need to pass `elementId` by hand. These bindings only take effect while the layer is open and the element is active (`active`).

Here's a minimal runnable example: press `a` on the Home screen to open a tool panel, and the panel element binds two keys directly — `w` (counting) and `q` (closing).

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
  const { openLayer, applyElement } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    // Press a to open the layer and mount an element into it
    return boundKeyboard(['a'], () => {
      openLayer('tool-panel', 10);
      applyElement('tool-panel', {
        element: ToolPanel,
        elementId: 'tool-panel-body',
      });
    });
  }, [boundKeyboard, openLayer, applyElement]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>Press a to open the tool panel</Text>
    </Box>
  );
}
registerComponent(Home, {});

// Elements inside a layer register bindings with boundKeyboard;
// useKeyboard attributes the binding to the current element's layer
function ToolPanel() {
  const { closeLayer } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const unBindW = boundKeyboard('w', () => setCount((n) => n + 1));
    const unBindQ = boundKeyboard('q', () => closeLayer('tool-panel'));
    return () => {
      unBindW();
      unBindQ();
    };
  }, [boundKeyboard, closeLayer]);

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
      <Text>🧰 Tool Panel (w to count: {count}, q to close)</Text>
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

After pressing `a`, a yellow-bordered tool panel appears in the top-right corner. Here:

- The `w` and `q` bindings are attributed automatically by `useKeyboard` to the `tool-panel-body` element in the `tool-panel` layer — no need to pass `elementId` manually;
- These two bindings only work while the layer is open and the element is active. Once `q` closes the layer, `ToolPanel` unmounts and the bindings are cleaned up — pressing `w` / `q` again triggers nothing;
- Conversely, if the layer was never opened, or you press `w` / `q` somewhere else, these bindings don't fire either.

### The rules of keyboard events between layers

A screen can have several layers open at once. The way keyboard events flow between layers follows a few fixed rules, which boil down to two phrases: **top-down, stop on hit**.

1. **Top-down**: the event starts from the layer with the **highest `zIndex`** and tries each layer in descending order;
2. **Broadcast within a layer**: inside one layer, the event is **broadcast** to every active element of that layer — multiple handlers in the same layer can respond to the same key at once;
3. **Stop on hit**: as soon as an element of a layer handles the event, the event is consumed and doesn't flow to lower layers, nor does it reach the screen stack;
4. **Bubble when missed**: if no element of a layer handles it, the event **bubbles** down to the next lower layer;
5. **Fall back to the screen stack**: if no layer handles it at all, the event finally reaches the **screen stack** stage and is handed to the current screen and the screens beneath it.

```tsx
openLayer('layer-b', 10); // opened first, lower zIndex
openLayer('layer-a', 20); // higher zIndex, higher keyboard priority
```

If both `layer-a` and `layer-b` bind the same key (say `return`), pressing it reaches `layer-a` (z=20) first; as long as it handles the event, `layer-b` (z=10) never receives it. If neither layer handles it, the event keeps bubbling toward the screen stack.

> **Note:** A layer's keyboard priority follows the same rule as its visual stacking: the higher the `zIndex`, the more on top it renders and the higher its keyboard priority. Modal layers render above ordinary layers, and only the modal layer with the highest `zIndex` receives keyboard events.

In the coming sections, we'll observe how these rules play out when several layers coexist, using more complete examples.

### Top-down: priority between layers

When several layers are open at once, a keyboard event starts from the **highest `zIndex`** layer and tries each one in descending order — that's "top-down".

Here's a minimal runnable example: press `b` / `t` to open two layers that both bind `return`, and watch which panel responds first.

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
  const { openLayer, applyElement } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    const openBottom = boundKeyboard('b', () => {
      openLayer('layer-bottom', 10);
      applyElement('layer-bottom', {
        element: BottomPanel,
        elementId: 'bottom',
      });
    });
    const openTop = boundKeyboard('t', () => {
      openLayer('layer-top', 20);
      applyElement('layer-top', { element: TopPanel, elementId: 'top' });
    });
    return () => {
      openBottom();
      openTop();
    };
  }, [boundKeyboard, openLayer, applyElement]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>Press b / t to open two layers, press return to see which panel responds</Text>
    </Box>
  );
}
registerComponent(Home, {});

function BottomPanel() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('return', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={2}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="blue"
      backgroundColor="black"
    >
      <Text>⬇️ layer-bottom (z=10) · return x{count}</Text>
    </Box>
  );
}

function TopPanel() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('return', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={44}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="yellow"
      backgroundColor="black"
    >
      <Text>⬆️ layer-top (z=20) · return x{count}</Text>
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

- Press `b` to open `layer-bottom` (z=10), press `t` to open `layer-top` (z=20);
- Press `return`: the event starts from the topmost `layer-top`, whose element handles `return` → **stop on hit**, `layer-bottom` never receives it;
- So no matter how many times you press `return`, only `layer-top`'s counter grows, and `layer-bottom` stays at 0.

That's the first rule between layers: **top-down — the higher the `zIndex`, the higher the priority**.

### Stop on hit and bubbling

On top of "top-down", two more behaviors shape how events flow between layers: **stop on hit** and **bubble when missed**.

The following example uses a log to show where three keys end up: `t` is handled by the top layer, `b` bubbles down to be handled by the bottom layer, and `p` is handled by no layer at all, so it falls through to the screen stack.

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
  const { openLayer, applyElement } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    // Press 1 / 2 to open the two layers
    const openTop = boundKeyboard('1', () => {
      openLayer('layer-top', 20);
      applyElement('layer-top', { element: TopPanel, elementId: 'top' });
    });
    const openBottom = boundKeyboard('2', () => {
      openLayer('layer-bottom', 10);
      applyElement('layer-bottom', {
        element: BottomPanel,
        elementId: 'bottom',
      });
    });
    // The page binds t / b / p itself
    const onT = boundKeyboard('t', () => setLog((l) => [...l, 'Page received t']));
    const onB = boundKeyboard('b', () => setLog((l) => [...l, 'Page received b']));
    const onP = boundKeyboard('p', () => setLog((l) => [...l, 'Page received p']));
    return () => {
      openTop();
      openBottom();
      onT();
      onB();
      onP();
    };
  }, [boundKeyboard, openLayer, applyElement]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>Press 1 / 2 to open layers, then press t / b / p to see where events land</Text>
      {log.map((line, i) => (
        <Text key={i} dimColor>
          {line}
        </Text>
      ))}
    </Box>
  );
}
registerComponent(Home, {});

function TopPanel() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('t', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={2}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="yellow"
      backgroundColor="black"
    >
      <Text>⬆️ layer-top (z=20) · t x{count}</Text>
    </Box>
  );
}

function BottomPanel() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('b', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={44}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="blue"
      backgroundColor="black"
    >
      <Text>⬇️ layer-bottom (z=10) · b x{count}</Text>
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

First press `1` and `2` to open both layers, then press `t`, `b`, `p` in turn:

- Press `t`: `TopPanel` in `layer-top` handles `t` → **stop on hit**, the page's `t` never fires, and "Page received t" won't show up in the log;
- Press `b`: `layer-top` doesn't handle `b` → the event **bubbles** to `layer-bottom`, where `BottomPanel` handles it → stop on hit, the page never receives `b`;
- Press `p`: no element in either layer handles `p` → the event passes through every layer, **falls to the screen stack**, the page's `p` fires, and "Page received p" shows up in the log.

Stringing the three rules together: **top-down → stop on hit; bubble when missed; fall back to the screen stack when nothing handles it**.

### Broadcast within a layer

Between layers the rule is "stop on hit", but **inside a layer it's the opposite**: the event is broadcast to **every active element** of that layer, so multiple handlers can respond to the same key at once.

The example below mounts two elements in the same layer, both binding `return`:

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
  const { openLayer, applyElement } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    // Press a to open the layer and mount two elements into it
    return boundKeyboard(['a'], () => {
      openLayer('panel', 10);
      applyElement('panel', { element: ElementA, elementId: 'element-a' });
      applyElement('panel', { element: ElementB, elementId: 'element-b' });
    });
  }, [boundKeyboard, openLayer, applyElement]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>Press a to open the panel, press return to see if both elements respond at once</Text>
    </Box>
  );
}
registerComponent(Home, {});

function ElementA() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('return', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={2}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="cyan"
      backgroundColor="black"
    >
      <Text>🅰️ Element A · return x{count}</Text>
    </Box>
  );
}

function ElementB() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('return', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={44}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="green"
      backgroundColor="black"
    >
      <Text>🅱️ Element B · return x{count}</Text>
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

After pressing `a` to open the `panel` layer, press `return`:

- `ElementA` and `ElementB` counters both go up by one — the event was broadcast to every active element in the layer;
- As soon as one element handles the event, the layer counts as "hit" and the event no longer flows to lower layers or the screen stack, but the **remaining elements inside the layer** still receive it.

That's the fundamental difference between "stop on hit" between layers and "broadcast" inside a layer.

## Summary

| Rule | Description |
| --- | --- |
| **Top-down** | The event starts from the layer with the highest `zIndex` and tries each layer in descending order |
| **Broadcast within a layer** | The event is broadcast to every active element in the layer; multiple handlers can respond at once |
| **Stop on hit** | An element of a layer handled the event, so it is consumed and goes no further |
| **Bubble when missed** | No element of a layer handled it, so it bubbles to the next lower layer |
| **Fall back to the screen stack** | No layer handled it at all, so it reaches the screen stack and is handed to the current screen |

## Caveats

1. **"Stop on hit" between layers, "broadcast" inside a layer.** These two rules target different levels: the former decides whether the event flows to lower layers, the latter decides how multiple elements in one layer share a single key press.
2. **Equal `zIndex` is ordered by open time.** When `zIndex` ties, the layer opened earlier sits lower and receives events later (decided by `createdAt`).
3. **Bindings only take effect while the layer is open and the element is active.** Once a layer closes or an element is deactivated, the corresponding bindings stop working.
4. **Modal layers have higher keyboard priority than ordinary layers.** Modal layers render above ordinary layers, and only the modal layer with the highest `zIndex` receives keyboard events — covered in a later article.

## Next steps

- Learn how to control keyboard reception for a specific element inside its layer — [unfinished doc](/todo)
