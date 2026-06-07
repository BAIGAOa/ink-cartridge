# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
npm run build        # Compile TypeScript (tsc --locale zh-CN)
npm run watch        # Watch mode compilation
npm run clean        # Remove dist/
npm test             # Run all tests (vitest run)
npm run test:watch   # Watch mode tests (vitest)
```

### Test Conventions

- **`*.test.tsx`** — uses jsdom environment via `@testing-library/react`. Ink's `useInput` is mocked so tests dispatch synthetic key events through a captured handler.
- **`*.ink.test.ts` / `*.ink.test.tsx`** — uses node environment via `ink-testing-library` for real Ink rendering tests.
- Tests live in `src/__tests__/` mirroring the source structure.
- Screen system tests call `clearRegistry()` in `beforeEach` and `clearDispatchers()` (if module-level navigation is used) to isolate test runs.
- Keyboard provider tests should clear captured `useInput` handlers and reset vi mocks in `afterEach`.

### Key Test Patterns

```tsx
// Mock useInput to capture the handler
vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useInput: (handler) => { capturedInputHandler = handler; } };
});

// Dispatch a key press
act(() => pressKey('s', {}));

// Register components before each test
registerComponent(Menu, {});
registerComponent(Game, {}, { parent: Menu });
```

## Architecture Overview

This is `@baigao_h/ink-kit` — a React Ink component kit for building terminal UIs. Built with **no third-party state management library** — all state is React context + `useReducer`/`useRef`.

### Core Systems (3 pillars)

**1. Screen System** (`src/screen/`)
- Tree-based screen navigation using a component registry.
- `registerComponent(Component, template, { parent })` builds a navigation tree.
- Navigation: `skip()` (down to child), `back()` (up to parent, supports `levels` param), `gotoScreen()` (jump across branches via LCA), `overlay()` / `closeOverlay()` (floating dialogs on top of stack).
- All navigation functions work both as React hooks (`useScreenSystem()`) and as **module-level imports** — module-level functions dispatch through a shared `_dispatchers` Set (supports multi-instance scenarios).
- `ScenarioManagementProvider` wraps the app with a `useReducer`-based state machine.
- `CurrentScreen` renders the active screen component (and overlay if open).
- Registry (`src/screen/registry.ts`) is a module-level `Map<Component, RegistryEntry>` with parent/child tracking.

**2. Keyboard System** (`src/keyboard/`)
- Per-screen-layer key bindings stored in `useRef<Map<Component, ScreenKeyboardLayer>>`.
- Event priority chain: `globalKeys(affectOverlay:true)` → overlay layer → `globalKeys(affectOverlay:false)` → screen stack (top to bottom).
- Key mechanisms:
  - `blockedKey()` (called `penetration` internally) — marks keys as transparent, allowing them to pass through the current layer.
  - `stop()` — prevents matching keys from propagating to lower layers. Supports `stopAction` mode to block by shortcut action ID.
  - `globalKeys()` — register shortcuts independent of the screen stack, with `cover`, `category`, and `affectOverlay` options.
  - `boundKeyboard()` — register per-screen key bindings. Supports `focusId`, `onlyThis`, `once`, and `times` options.
- Focus system: `useFocusState(focusId)`, `focusSet()`, `focusNext()`, `focusPrev()`, `focusCurrent()`, `focusUnregister()`. Tab/Shift+Tab cycle through focus targets within a layer.
- Shortcut actions via `defineShortcutAction()` / `addAction()` / `hasAction()` / `removeAction()` / `modifyAction()` — decouple operation definition from key binding.
- **Key constraint**: `KeyboardProvider` must be nested inside `ScenarioManagementProvider`.

**3. Component Library** (`src/components/`)
- Independent components, each in its own folder with a `README.md`.
- All interactive components (SelectInput, TextInput, etc.) integrate with the keyboard focus system via `focusId`.
- Form system (`Form` + `Field`) uses React context for validation state, supports Ctrl+Enter submit.
- `ConfirmDialog` is designed for the overlay system.

### Supporting Systems

- **Theme System** (`src/theme/`): `ThemeProvider` + `useTheme` hook, with CLI codegen for type-safe themes.
- **I18n System** (`src/language/`): `LanguageProvider` + `useI18n` hook, with `t()` translation, interpolation, and CLI codegen for type-safe translation keys.
- **CLI** (`src/cli/`): `ink-kit init` (scaffold), `initTheme`, `makeLanguageType`, `makeThemeType`.

### Output Structure

- TypeScript source in `src/`, compiled to `dist/` via `tsc`.
- `src/index.ts` is the package entry point, re-exporting all public APIs.

### CI/CD

- GitHub CI runs `npm ci` → `npm run build` → `npm test` on Node 22 & 24 for pushes/PRs to `main` and tags.
- On GitHub release publish: builds and publishes to npm (with idempotency check to skip already-published versions).
