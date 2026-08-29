# Learning binding attribution: the owner stack

In almost every previous chapter we've been calling `boundKeyboard` — inside pages, inside layer elements, inside modal layer elements. But you may not have thought about it: **why does the same method behave so differently depending on where it's called?**

For example, in `layer-keyboard`, the `w` inside the panel element only takes effect while the panel is open, while the `a` on the Home page stays effective. Same `boundKeyboard` — why?

In this chapter, we'll uncover the answer. First we'll explain the mechanism behind it — the **owner** and the **owner stack** — then walk through, scenario by scenario, where `boundKeyboard` and friends land when called in different places.

## Attribution: where a binding lives

First, one concept: **attribution** is where a binding "lives". A binding doesn't exist in isolation — it's always attached to some keyboard layer. When the engine dispatches keys, it only looks for bindings in the relevant keyboard layer; it doesn't scan everything globally.

```
Call site                  Where the binding lives              When it takes effect
─────────────────────────────────────────────────────────────────────────────────────
Page component Home         Home's keyboard layer                Home is in the nav stack
Layer element ToolPanel     ToolPanel element of layer panel     layer open and element active
Modal element ConfirmDialog ConfirmDialog element of modal       modal layer is on top
```

It boils down to one sentence: **where you call it, it belongs to where it was called**.

## The owner and the owner stack

A binding method determines an **owner** when called — it decides which keyboard layer the binding attaches to. When called through `useKeyboard()`, the owner is decided by the **context of the call site**: a call inside a page component has the current page component as owner; a call inside a layer element has that layer ID as owner; a call inside a modal element has that modal layer ID as owner.

How does the engine know "who is the owner at the current call site"? It uses an **owner stack**. `useKeyboard()` pushes the current owner when the component mounts, and each binding-method call pushes it once more, then pops it after resolving:

```
Calling boundKeyboard inside a layer element — the stack:
          push                   resolve → pop
        ┌──────────────┐    ┌──────────────────────────┐
  has   │  Home        │    │ binding → panel layer · element │
        │  panel (layer) │ → │                          │
        └──────────────┘    └──────────────────────────┘
```

When the call happens inside a layer/modal element, `useKeyboard` reads the layer or modal ID from `LayerElementContext` / `ModalLayerElementContext` and pushes it as the owner:

```tsx
// useKeyboard internals (simplified): infer the owner from context
const ownerId =
  layerCtx?.layer.layerId ??       // layer element → layer ID
  modalCtx?.modalLayer.layerId ??  // modal element → modal layer ID
  topPageComponent                 // page component → page component
```

When resolving attribution, the engine reads the top of the stack — so "whoever you're inside when you call it, you belong to them".

If the stack is empty, the engine falls back and guesses an owner in this order:

```
getCurrentOwner() fallback order
  1. top of the owner stack
  2. topmost modal layer
  3. topmost ordinary layer
  4. current page
  5. none of these → no owner; calling boundKeyboard throws
```

When there's no modal layer, layer, or page on screen, there is no owner — calling `boundKeyboard` then throws directly:

```
[keyboard-engine] boundKeyboard() must be called inside a screen component or overlay.
```

## From owner to landing point: `elementId`

After the owner is settled, one more detail decides the binding's **exact landing point**: `elementId`. A single layer can host multiple elements, so "layer ID" alone isn't enough — you also need to know which element.

`useKeyboard()` injects `elementId` from the context automatically (same source as the owner), so when you call inside a layer/modal element you usually don't need to pass it by hand:

```tsx
// No need to pass elementId manually — useKeyboard already injected it
boundKeyboard('w', () => setCount(...))

// Passing it manually overrides the auto-injection
boundKeyboard('w', () => setCount(...), { elementId: 'tool-panel-body' })
```

"Owner + elementId" together pin down the unique landing point:

| Owner | `elementId` | Where the binding lands |
| --- | --- | --- |
| Page component | none | the page's keyboard layer |
| Layer ID | present (auto-injected) | the keyboard of the corresponding element in the layer |
| Modal layer ID | present (auto-injected) | the keyboard of the corresponding element in the modal layer |

## Attribution in a screen

An ordinary screen is the most intuitive case: **where you call it, it belongs to that screen**. Calling `boundKeyboard` inside a page component attaches the binding to that screen's keyboard layer.

```tsx
function Home() {
  const { boundKeyboard } = useKeyboard()

  useEffect(() => {
    // Called inside the Home component → the binding belongs to the Home screen
    return boundKeyboard(['a'], () => openLayer('panel', 10))
  }, [boundKeyboard])
}
```

This binding lives on Home's keyboard layer: it stays effective as long as Home is in the nav stack. When `skip` / `back` leave Home, the screen and its keyboard layer are destroyed together, and the binding dies with it.

## Attribution in a layer

A call inside a layer element belongs to the layer that element lives in. `useKeyboard` reads both the layer ID and the element ID from `LayerElementContext`, so the binding lands on the "layer + element" combination.

```tsx
function ToolPanel() {
  const { boundKeyboard } = useKeyboard()

  useEffect(() => {
    // Called inside a layer element → belongs to the current element of layer tool-panel
    return boundKeyboard(['w'], () => setCount((n) => n + 1))
  }, [boundKeyboard])
}
```

This binding only takes effect while the layer is open and the element is active: it stops responding when the layer closes, the element is paused, or a page switch clears the layer.

## Attribution in a modal layer

A modal layer works "much the same" as an ordinary layer — a call inside a modal element belongs to the "modal layer + element" combination. The only difference is the effective condition: a modal layer's bindings only take effect once the modal layer is **on top** (see the "Modal layer keyboard events" chapter).

```tsx
function ConfirmDialog() {
  const { boundKeyboard } = useKeyboard()

  useEffect(() => {
    // Called inside a modal element → belongs to the current element of modal confirm
    return boundKeyboard(['return'], () => closeModalLayer('confirm'))
  }, [boundKeyboard])
}
```

## The attribution rules at a glance

Putting the mechanism and the scenarios together, there are three rules:

1. **The call site decides the owner.** Called inside a page, the owner is the page; inside a layer element, the owner is the layer ID; inside a modal element, the owner is the modal layer ID.
2. **Owner + `elementId` decide the landing point.** The engine attaches the binding to exactly one keyboard layer.
3. **Attribution decides when it takes effect.** Page bindings take effect with the page; layer-element bindings with the layer open and the element active; modal-element bindings with the modal layer on top.

```
The same key h, two bindings
───────────────────────────────────────────
Binding A: Home page      → Home keyboard layer → effective while the panel is closed
Binding B: ToolPanel element → panel layer element → effective while the panel is open
```

## Best practices

1. **Register bindings inside the element when you want them to follow its lifecycle** — the binding mounts and unmounts with the element. If you register on the page instead, you have to manually manage whether the element exists.

2. **Put `boundKeyboard` inside `useEffect` and return its unbind function** — the binding is cleaned up automatically when the page leaves, avoiding "ghost keys" (see the basic binding chapter).

3. **Don't rely on the "fallback when the stack is empty"** — that's just a safety net. The normal way is to call inside the right component/element so `useKeyboard` derives the owner from context, rather than hoping the engine guesses.

## Complete example

Let's demonstrate two attributions with a single key `h`: the Home page binds `h` to log lines, and the tool panel element also binds `h` to count — the two coexist independently, and which one is effective depends on whether the panel is open. Save the code as a `.tsx` file and run it with `npx tsx <file>.tsx`.

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
  const { openLayer, applyElement, closeLayer } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const open = boundKeyboard('1', () => {
      openLayer('tool-panel', 10);
      applyElement('tool-panel', {
        element: ToolPanel,
        elementId: 'tool-panel-body',
      });
    });
    const close = boundKeyboard('c', () => closeLayer('tool-panel'));
    // The h binding on the page: belongs to the page
    const onH = boundKeyboard('h', () => setLog((l) => [...l, 'Page received h']));
    return () => {
      open();
      close();
      onH();
    };
  }, [boundKeyboard, openLayer, applyElement, closeLayer]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>Press 1 to open the panel · c to close · press h to watch the attribution</Text>
      {log.map((line, i) => (
        <Text key={i} dimColor>
          {line}
        </Text>
      ))}
    </Box>
  );
}
registerComponent(Home, {});

function ToolPanel() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    // The h binding inside a layer element: belongs to the tool-panel layer
    return boundKeyboard('h', () => setCount((n) => n + 1));
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
      <Text>🧰 Tool Panel (h x{count})</Text>
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

- Press `h` while the panel is closed: the page receives it, and the log shows "Page received h";
- Press `1` to open the panel, then press `h`: the panel element handles it first (layers outrank the page), the page doesn't receive it, the log stays, and the count goes up by one;
- Press `c` to close the panel, then press `h`: the page receives it again.

Same key, two bindings, different attributions — that's call location deciding where a binding lands.

## Next steps

- Learn about named groups of the focus system. [unfinished doc](/todo)
