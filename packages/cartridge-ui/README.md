# @cartridge-engine/ui

A UI kit for [ink-cartridge](https://github.com/BAIGAOa/ink-cartridge) — a cohesive set of components for building multi-page, interaction-dense terminal apps where keyboard, mouse, and focus work together.

## Status

Early scaffold. Components are implemented in-tree; the index below is filled in alongside the source. APIs are not stable until a 1.0.0 release.

## Design philosophy

Atomic, minimal, composable, controllable — each component is a thin wrapper over
one framework mechanism, passing Ink props straight through.

## Installation

```bash
npm install @cartridge-engine/ui
```

Peer dependencies: `react >= 18`, `ink >= 5`, and `ink-cartridge` for the framework (screens, keyboard engine, theme, i18n).

## Components

| Component | Description | Status |
|-----------|-------------|--------|
| [Button](src/button/Button.tsx) | Declarative `useMouseRegion` wrapper — fills its parent, forwards its ref for external `boundKeyboard` linkage | ✓ |

## Usage

```tsx
import { CurrentScreen, KeyboardProvider, ScenarioManagementProvider } from "ink-cartridge";
// import { ... } from "@cartridge-engine/ui";

render(
	<ScenarioManagementProvider defaultScreen={Home} fullScreen>
		<KeyboardProvider mouse>
			<CurrentScreen />
		</KeyboardProvider>
	</ScenarioManagementProvider>,
);
```

## Development

```bash
npm run build -w @cartridge-engine/ui   # tsc build
npm test -w @cartridge-engine/ui        # vitest run
```

## See also

- [ink-cartridge](https://github.com/BAIGAOa/ink-cartridge) — core framework: screen system, keyboard engine, theme, i18n, CLI
- [API docs](https://baigaoa.github.io/ink-cartridge/framework/) — generated from JSDoc, auto-published on `main`
