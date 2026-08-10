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
- **Layered keyboard engine** — Each screen owns its key bindings. A 9-stage pipeline resolves conflicts between modal layers, layers, global keys, and the screen stack. Focus system partitions keys within the same layer.
- **Mouse regions** — Enable `mouse` on `KeyboardProvider` and mark any `<Box>` with `useMouseRegion` to make it clickable, hoverable, and draggable. The engine hit-tests xterm-mouse events against measured element rectangles, following the same modal > layer > root priority as keyboard events.


## Quick Start

```tsx
import React, { useContext, useEffect, useState } from "react";
import { Box, Text, render } from "ink";
import {
	CurrentScreen,
	KeyboardProvider,
	ModalLayerElementContext,
	registerComponent,
	ScenarioManagementProvider,
	useKeyboard,
	useMouseRegion,
	useScreenSystem,
} from "ink-cartridge";

// ── Home ──
function Home() {
	const { skip, openModalLayer, applyElementToModalLayer } = useScreenSystem();
	const { boundKeyboard } = useKeyboard();

	useEffect(() => {
		const toProgress = boundKeyboard(["p"], () => skip(ProgressBar, {}));
		const modals = boundKeyboard(["m"], () => {
			const stacked = [
				["low", 1, 0, 80],
				["high", 2, 4, 70],
				["high-high", 3, 8, 60],
				["high-high-high", 4, 10, 55],
				["high-high-high-high", 5, 12, 50],
				["high-high-high-high-high", 6, 13, 45],
				["high-high-high-high-high-high", 7, 12, 40],
				["high-high-high-high-high-high-high", 8, 11, 35],
			] as const;

			for (const [layerId, zIndex, top, left] of stacked) {
				openModalLayer(layerId, zIndex);
				applyElementToModalLayer(layerId, {
					elementId: `${layerId}-modal`,
					element: () => <Modal top={top} left={left} />,
				});
			}
		});
		return () => {
			toProgress();
			modals();
		};
	}, [boundKeyboard]);

	return (
		<Box flexDirection="column">
			<Text bold>🏠 Home</Text>
			<Text>Press P to open Progress Bar</Text>
			<Text>Press M to open stacked modals</Text>
			<Text>Click Cancel on any modal to close it</Text>
		</Box>
	);
}
registerComponent(Home, {});

// ── Progress Bar ──
function ProgressBar() {
	const [value, setValue] = useState(50);
	const { back } = useScreenSystem();
	const { boundKeyboard } = useKeyboard();

	useEffect(() => {
		const left = boundKeyboard(["left"], () => setValue((v) => Math.max(0, v - 5)));
		const right = boundKeyboard(["right"], () => setValue((v) => Math.min(100, v + 5)));
		const esc = boundKeyboard(["escape"], () => back());
		return () => {
			left();
			right();
			esc();
		};
	}, [boundKeyboard]);

	// Smooth color gradient: red(0) → yellow(50) → green(100)
	const r = value <= 50 ? 255 : Math.round(255 - (value - 50) * 5.1);
	const g = value <= 50 ? Math.round(value * 5.1) : 255;
	const color = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}00`;

	const filled = Math.round(value * 0.4);
	const bar = "█".repeat(filled) + "░".repeat(40 - filled);

	return (
		<Box height="100%" width="100%" justifyContent="center" alignItems="center" flexDirection="column">
			<Text dimColor>← → adjust  ·  Esc back</Text>
			<Text color={color}>{bar} {value}%</Text>
		</Box>
	);
}
registerComponent(ProgressBar, {}, { parent: Home });



function Modal({ top, left }: { top: number; left: number }) {
	const { closeModalLayer } = useScreenSystem();
	const { boundKeyboard } = useKeyboard();
	const modalCtx = useContext(ModalLayerElementContext);
	const layerId = modalCtx?.modalLayer.layerId;

	useEffect(() => {
		if (!layerId) return;
		return boundKeyboard(["escape"], () => closeModalLayer(layerId));
	}, [boundKeyboard, closeModalLayer, layerId]);

	return (
		<Box
			position="absolute"
			top={top}
			left={left}
			width={46}
			borderStyle="round"
			borderColor="yellow"
			padding={1}
			backgroundColor="black"
			flexDirection="column"
		>
			<Text bold color="yellow">
				⚠ cartridge.exe — Application Error
			</Text>
			<Text color="yellow">  Unhandled exception has occurred in your application.</Text>
			<Text color="yellow">  </Text>
			<Text color="yellow">  NullReferenceException:</Text>
			<Text color="yellow">  Object reference not set to an instance of an object.</Text>
			<Box flexDirection="row" justifyContent="flex-end" marginTop={1}>
				{/* Click-to-close button: a child region with a higher priority
				    wins over the modal body, so only the button reacts. */}
				<ModalButton
					label="Cancel"
					onPress={() => {
						if (layerId) closeModalLayer(layerId);
					}}
				/>
			</Box>
			<Text dimColor>Esc closes · click Cancel to close</Text>
		</Box>
	);
}

// A small clickable control. `priority: 1` makes it win over any region that
// contains it (the modal body would be a priority-0 region).
function ModalButton({ label, onPress }: { label: string; onPress: () => void }) {
	const [hovered, setHovered] = useState(false);
	const ref = useMouseRegion(
		{
			onClick: onPress,
			onEnter: () => setHovered(true),
			onLeave: () => setHovered(false),
		},
		{ priority: 1 },
	);
	return (
		<Box borderStyle="round" borderColor={hovered ? "green" : "gray"} marginLeft={1} ref={ref}>
			<Text>{label}</Text>
		</Box>
	);
}

render(
	<ScenarioManagementProvider defaultScreen={Home} fullScreen>
		<KeyboardProvider mouse>
			<CurrentScreen />
		</KeyboardProvider>
	</ScenarioManagementProvider>
);

```

<div align="center">
<img src="static/quickstart-keyboard.gif" width="2040" alt="Progress bar — ← → adjusts, color transitions red→yellow→green" />

<img src="static/quickstart-mouse.gif" width="2040" alt="Mouse controls — clicking Cancel closes a stacked modal, Esc works too" />
</div>

## Installation

```bash
npm install ink-cartridge
```

For the standalone keyboard engine (framework-agnostic):

```bash
npm install @cartridge-engine/keyboard-engine
```

Components are published as individual packages — install only what you need:

```bash
npm install @cartridge-engine/select @cartridge-engine/text-input @cartridge-engine/form
```

| Package | Exports |
|---------|---------|
| `@cartridge-engine/select` | SelectInput, SelectRow, MultiSelectInput |
| `@cartridge-engine/text-input` | TextInput, UncontrolledTextInput |
| `@cartridge-engine/form` | Form, Field, useFormContext |
| `@cartridge-engine/confirm-dialog` | ConfirmDialog |
| `@cartridge-engine/badge`, `divider`, `fold`, `key-hint`, `number-input`, `progress-bar`, `search-bar`, `search-input`, `spinner`, `tabs` | matching component |


## Documentation

API docs are auto-published to GitHub Pages on every push to `main`:

- [ink-cartridge API docs](https://baigaoa.github.io/ink-cartridge/framework/) — keyboard, screen, event, theme, language, cli
- [keyboard-engine API docs](https://baigaoa.github.io/ink-cartridge/engine/) — standalone engine APIs (framework-agnostic)

## For AI

AI-friendly project — see [AGENTS.md](AGENTS.md) for coding conventions, [agents/rules/](agents/rules/) for conditional rules, and [docs-agents/](docs-agents/) for reference material. AI writes, humans review and sign off.

## Examples

Runnable demos for every component. See [examples/README.md](examples/README.md) for the full list and run commands.

## License

[MIT](LICENSE)
