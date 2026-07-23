<div align="center">
        <br>
        <br>
        <img width="440" alt="cartridge" src="static/cartridge.png">
        <br>
        <br>
        <br>					 
</div>

<h1 align="center">Cartridge</h1>

>A frame for rapidly building complex, multi-page, interaction-heavy terminal applications — filling the critical gaps Ink leaves open.

[![CI](https://github.com/BAIGAOa/ink-cartridge/actions/workflows/ci.yml/badge.svg)](https://github.com/BAIGAOa/ink-cartridge/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ink-cartridge.svg)](https://www.npmjs.com/package/ink-cartridge)
[![npm version](https://img.shields.io/npm/v/@cartridge-engine/keyboard-engine.svg?label=keyboard-engine)](https://www.npmjs.com/package/@cartridge-engine/keyboard-engine)
[![coverage](https://img.shields.io/badge/coverage-90%25-brightgreen)](https://github.com/BAIGAOa/ink-cartridge)
[![coverage](https://img.shields.io/badge/keyboard--engine%20coverage-90%25-brightgreen)](https://github.com/BAIGAOa/ink-cartridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Documentation](#documentation)
- [For AI](#for-ai)
- [Examples](#examples)
- [License](#license)

## Design Philosophy

Ink gives you `useInput` and `render`. Everything else — screen navigation, layered keyboard events, focus management, cross-component communication — you build yourself. ink-cartridge provides all of that, designed for **multi-page, interaction-dense terminal apps** where a single global `useInput` with `if-else` chains breaks down.

TWO pillars:

- **Screen as component** — Every React component is a screen. Register them into a tree, navigate with `skip` / `back` / `gotoScreen`. No hand-written conditional rendering.
- **Layered keyboard engine** — Each screen owns its key bindings. A 9-stage pipeline resolves conflicts between modals, overlays, global keys, and the screen stack. Focus system partitions keys within the same layer.


## Quick Start

```tsx
import { Box, render, Text } from "ink";
import {
  CurrentScreen,
  KeyboardProvider,
  registerComponent,
  ScenarioManagementProvider,
  useKeyboard,
  useScreenSystem,
} from "ink-cartridge";
import React, { useEffect, useState } from "react";

function Main() {
  // Get key APIs through hooks
  const { skip } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    return boundKeyboard(["s"], () => skip(Counter, {}));
  }, [boundKeyboard]);

  return (
    <Box
      height="100%"
      width="100%"
      justifyContent="center"
      alignContent="center"
    >
      <Text bold> Press S to Counter </Text>
    </Box>
  );
}

// Registering a Component in the Registry
registerComponent(Main, {});

function Counter() {
  const [count, setCount] = useState(0);
  const { boundKeyboard } = useKeyboard();
  const { back } = useScreenSystem();

  useEffect(() => {
    const u1 = boundKeyboard(["up"], () => {
      setCount((prev) => prev + 1);
    });
    const u2 = boundKeyboard(["down"], () => {
      setCount((prev) => prev - 1);
    });

    // Used to go back to Main
    const uBack = boundKeyboard(["escape"], () => back());

    // Return to the unbind function to ensure that there is no confusion.
    return () => {
      u1();
      u2();
      uBack();
    };
  }, [boundKeyboard]);

  return (
    <Box
      height="100%"
      width="100%"
      justifyContent="center"
      alignContent="center"
    >
      <Text bold color="yellow">
        Count: {count}
      </Text>
    </Box>
  );
}

// Register the counter component as a child of the main interface
registerComponent(
  Counter,
  {},
  {
    parent: Main,
  },
);

// Rendering main interface
// Note: The screen system provider must be wrapped around the Keyboard Provider
// Because the keyboard system depends on the screen system for data
// Set the Main interface as the default interface
// Full Screen is an optional full screen model
// The keyboard system can turn on autoTab to automatically host the focus rotation function
// The Current Screen component must be used, otherwise functions such as jumping, including mode boxes, will be disabled
render(
  <ScenarioManagementProvider defaultScreen={Main} fullScreen>
    <KeyboardProvider autoTab>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
```

## Installation

```bash
npm install ink-cartridge
```

For the standalone keyboard engine (framework-agnostic):

```bash
npm install @cartridge-engine/keyboard-engine
```


## Documentation

- [ink-cartridge API docs](docs/) — keyboard, screen, event, components, theme, language, dev-tool, cli
- [keyboard-engine API docs](src/keyboard-engine/docs/API/) — standalone engine APIs (framework-agnostic)

## For AI

AI-friendly project — see [AGENTS.md](AGENTS.md) for coding conventions, [agents/rules/](agents/rules/) for conditional rules, and [docs-agents/](docs-agents/) for reference material. AI writes, humans review and sign off.

## Examples

Runnable demos for every component. See [examples/README.md](examples/README.md) for the full list and run commands.

## License

[MIT](LICENSE)
