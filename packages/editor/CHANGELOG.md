# blots-editor

## 0.0.8

### Patch Changes

- a635c04: ## blots-editor (packages/editor)

  ### Patch / Fix

  - **fix**: Add `#!/usr/bin/env node` shebang to the CLI entry — after a global install, the `blots-editor` command runs under Node correctly instead of being opened by the OS's `.js` file association (e.g. VS Code opening `dist/index.js` on Windows).

## 0.0.7

### Patch Changes

- 3011db8: ## ink-cartridge (framework)

  ### Minor / Feature

  - **feat**: `useMouseRegion` gains an `onWheel` callback — wheel events (`wheel-up` / `wheel-down` / `wheel-left` / `wheel-right`) fire when they hit a region, sharing the same hit-test priority chain as `onClick` (modal → layer → root)

  - **feat**: `KeyboardEngine` mouse support completed — `processMouseEvent` now dispatches `wheel` events (previously silently dropped); `MouseRegionService` gains `processWheel`

  ### Patch / Fix

  - **fix**: `KeyboardProvider` mouse subscription now includes `wheel` — previously only `click/move/press/drag/release` were subscribed, so wheel events died at the provider (symptom: clicks worked, wheel did nothing at all)

  - **fix**: Mouse escape sequences no longer pollute the keyboard stream — new `MouseReportFilter` intercepts SGR mouse reports (which Ink hands over as text like `[<0;20;5M` after stripping the ESC prefix) so they never reach the `useInput` keyboard pipeline (previously an editor would print mouse move/click garbage into the document)

  ### Docs

  - **docs**: engine docs gain `API/mouse-region.md` (full API for `registerMouseRegion` / `unregisterMouseRegion` / `processMouseEvent` / `getHoveredMouseRegion`, incl. wheel and the coordinate model); `API/README.md` naming table synced

  - **docs**: `KeyboardEngine-API.md` gains a Mouse Methods section; `react-ink.md` and `standalone.md` gain mouse integration sections; `docs/README.md` index points to the engine docs; `useMouseRegion-API.md`, `KeyboardProvider-API.md`, and `keyboard/README.md` document `onWheel` and the sequence-filtering behavior

  ***

  ## blots-editor (packages/editor)

  ### Breaking / Refactor (P0 foundation)

  - **refactor**: core model rewritten — `TextCalculation` removed, split into a pure-TS core `core/document/` (`position` / `text-line` / `document` / `operations`) plus a coordinator `core/editor-controller`

  - **feat**: command-driven architecture — `editor-controller` command registry + `execute(cmd)`; the keymap layer only translates keys → commands, paving the way for vim modes to be layered on with zero core changes

  - **feat**: dual-column coordinates (`logical` / `visual`) — editing uses code units, display and cross-line movement use terminal columns, fixing cursor drift on CJK/emoji

  - **feat**: every atomic operation carries its own `invert` — each edit (insert / delete / split / join / indent) can be replayed in reverse, laying the groundwork for P1 undo/redo

  - **fix**: `delete` key semantics corrected — the old prototype treated `delete` as `backspace`; now split by correct semantics (delete before the cursor / after the cursor, incl. cross-line joins)

  ### Feature (mouse)

  - **feat**: mouse click positions the cursor — new `view/click-mapping.ts` coordinate conversion + `Document.setCursorAtVisual` + `cursor.setPosition` command; gutter clicks clamp to the text's left edge, wide chars snap left, scroll offset handled

  - **feat**: mouse wheel scrolling — `onWheel` → `cursor.pageUp/pageDown` (one line per notch, cursor follows); `KeyboardProvider` enables `mouse`

  ### Test / Chore

  - **test**: 47 new tests — `document.test.ts` (18), `operations.test.ts` (23), `click-mapping.test.ts` (4), etc., covering wide-char cursors, visual-column preservation, invert restoration, and scroll boundaries

  - **chore**: directory structure aligned with the plan — `src/core/text` and `src/core/view` migrated to `src/core/document` + `src/view`

- Updated dependencies [3011db8]
  - ink-cartridge@5.1.3

## 0.0.6

### Patch Changes

- 5f880ba: Disruptive Refactoring: Completely transforming the keyboard and screen systems into layer-based systems.
- Updated dependencies [5f880ba]
  - ink-cartridge@5.0.0

## 0.0.5

### Patch Changes

- c601978: fix: Fixed issues with cursor misalignment and rendering misalignment.

## 0.0.4

### Patch Changes

- 3f50758: feat: Adaptive line number
- 3f50758: fix: Fix for line number error display

## 0.0.3

### Patch Changes

- d597692: feat: Adaptive line number

## 0.0.2

### Patch Changes

- 1f82e98: chore: init the package
