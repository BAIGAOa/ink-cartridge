# AGENTS.md

Project conventions for AI coding agents working on `ink-cartridge` — a React Ink component kit for building terminal UIs. Built with React context + `useReducer`/`useRef` (no third-party state management).

## Stack

- TypeScript 5.9, strict mode, Node16 modules, ES2022 target, JSX (`"jsx": "react"`)
- React 19 + Ink 7 (terminal UI framework)
- vitest 4.x with `ink-testing-library` (synchronous `render()` in node environment — returns `{ lastFrame, stdin, unmount }`, key presses via `stdin.write()`)
- No third-party state management

## Commands

```bash
npm run build        # tsc
npm run watch        # tsc --watch
npm test             # vitest run
npm run test:watch   # vitest --watch
npm run clean        # rm -rf dist
```

## Done

A task is not complete until:
1. `npm run build` exits zero
2. `npm test` exits zero
3. Public API changes are reflected in `docs/` and `src/index.ts`

## Architecture

**Screen System** (`src/screen/`) — Tree-based navigation via `registerComponent(Component, template, { parent })`. Navigation: `skip()` (down), `back()` (up, `levels` param), `gotoScreen()` (jump via LCA), `overlay()` / `closeOverlay()` (floating dialogs). All nav functions work as React hooks AND module-level imports (`_dispatchers` Set). `ScenarioManagementProvider` wraps the app; `CurrentScreen` renders the active screen.

**Keyboard System** (`src/keyboard/`) — Layered key bindings. Priority: `globalKeys(affectOverlay:true)` → overlay → `globalKeys(affectOverlay:false)` → screen stack (top→bottom). Mechanisms: `boundKeyboard()` (per-screen), `penetration()` (pass-through), `stop()` (propagation barrier), `globalKeys()`. Focus: `useFocusState(focusId)`, Tab/Shift+Tab cycling. Shortcut actions: `defineShortcutAction`/`addAction`/`removeAction`.

**Component Library** (`src/components/`) — 14 components, each in own folder. All interactive ones use `focusId`. Form system (`Form` + `Field`) with validation context, Ctrl+Enter submit.

**Supporting**: Theme (`ThemeProvider` + `useTheme`), I18n (`LanguageProvider` + `useI18n` + `t()`), Dev Tool (`docs/dev-tool.md`), CLI (`init`, `initTheme`, `makeLanguageType`, `makeThemeType`).

### ink-blots vs examples

- `ink-blots/` — multi-system stress-test TUI apps. "Does SelectInput work inside an overlay with a modal open and a global sequence pending?" Each app's README logs bugs found.
- `examples/` — single-API demos. "Here's how SelectInput works."

## Watch out for

- `penetration()` means **pass-through**, NOT "block". Makes keys transparent to lower layers. (Formerly `blockedKey`.)
- `KeyboardProvider` MUST nest inside `ScenarioManagementProvider`. Reversed silently breaks keyboard.
- `_dispatch` is set in `useEffect` — unavailable during `componentDidCatch`. Error boundaries calling `overlay()` will find `_dispatch` is null.
- `clearShortcutOperations` is a no-op at module level — keyboard state is per-instance via `useRef`.
- Overlay auto-closes on `skip`/`back`/`gotoScreen` (handled in reducer).
- `useRef<<T>` in TSX is parsed as JSX — must be `useRef<T>` (single `<`).
- Escape key (`\x1b`) is unreliable with `ink-testing-library`'s `stdin.write`.

## Coding conventions

### JSX
All new code MUST use JSX. `React.createElement` is forbidden.

### Type safety
- Avoid `any`. If unavoidable, comment why and which invariants you assert.
- Avoid `as`. If unavoidable, comment why the assertion is safe (e.g., "validated by `isValidTheme` above").
- Prefer `unknown` over `any`, narrow via type guards.
- If genuinely stuck with type safety, ask the user before writing unsafe code.

### Error handling
- All async operations must handle errors (try/catch).
- Error prefix: `[ink-cartridge]`.
- Ambiguous edge cases: ask the user before choosing throw/log/recover.

### File naming
- Components: `PascalCase.tsx`
- Non-components (utils, types, hooks, helpers): `camelCase.ts`
- Tests: match source file name + `.test.ts` or `.test.tsx`

### Props with .length/.map()
```tsx
function KeyHint({ keys = [] }: Props) { ... }
function TextInput({ value = '' }: Props) { ... }
```

### Comments
Explain **why**, not what. No decorative separators. See `docs-agents/comment-conventions.md` for full examples.

### No over-engineering
- Simplest code that passes tests. No abstractions "just in case."
- Extract patterns only after the 3rd occurrence.
- Ask before any non-trivial refactor.

## Testing

New tests go in `tests/` (NOT `src/__tests__/` — migration in progress). Environment is `node` (configured in `vitest.config.ts`).

```
tests/<subsystem>/
├── base/              # basic logic tests
│   ├── _helpers.tsx   # shared utilities
│   └── *.test.ts(x)
└── *.test.tsx         # complex / special-case tests
```

- Black-box, concise, precise, non-redundant.
- Must compile (`tsc` passes under `tests/tsconfig.json`).
- `clearRegistry()` in `beforeEach`; `clearDispatchers()` for module-level isolation.
- `ink-testing-library`: synchronous `render()`, effects need `flush()` (50ms), `stdin.write()` wrapped in `act()`.

See `agents/rules/testing.md` (loaded when editing `tests/**/*`) and `docs-agents/test-patterns.md` for examples.

## Documentation

- Public API changes → update `docs/` and `src/index.ts`.
- New docs go in `docs/`. Match the style of existing files.
- `docs-agents/` is agent reference material (not user-facing docs).

## Reference docs

| File | Load when |
|------|-----------|
| `docs-agents/comment-conventions.md` | Writing comments or JSDoc |
| `docs-agents/coding-patterns.md` | Writing components or hooks |
| `docs-agents/react-guidelines.md` | Writing React effects or callbacks |
| `docs-agents/test-patterns.md` | Writing tests |

## Conditional rules

| File | Trigger |
|------|---------|
| `agents/rules/testing.md` | `tests/**/*` |
| `agents/rules/components.md` | `src/components/**` |
| `agents/rules/public-api.md` | `src/index.ts` |
| `agents/rules/examples.md` | `examples/**/*` |
| `agents/rules/comments.md` | `src/**/*`, `tests/**/*`, `examples/**/*`, `docs/**/*`, `*.md` |

## CI/CD

- GitHub CI: `npm ci` → `npm run build` → `npm test` on Node 22 & 24 for pushes/PRs to `main` and tags.
- On GitHub release publish: idempotency check → `npm publish --access public`.
