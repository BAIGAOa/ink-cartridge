# blots-editor

## 0.0.10

### Patch Changes

- b130db8: - **feat**(`blots-editor`): soft-wrap long lines at the editable width minus one cell (right-edge margin). The document gains a visual-line model (`visualLineCount` / `visualLineAt` / `setWrapWidth`) layered over the logical lines: line numbers render only on each logical line's first segment, the cursor moves by visual lines keeping its horizontal offset (clamping to the segment end only when the target visual line is narrower), scroll/paging work in visual-line terms, and mouse clicks on wrapped continuations land on the right logical position. Rendering is driven by `useBoxMetrics` width, so resizing re-wraps live.
  - **feat**(`blots-editor`): rainbow-gradient logo ("Blots Editor") generated with the same stack as `oh-my-logo --filled` (cfonts block glyphs + gradient-string palette, truecolor via `chalk.level`), rendered as plain ANSI text so it embeds in Ink. The logo is responsive: wide terminals show the words side by side; narrow terminals stack them, and as the terminal height shrinks the font steps down (block → simple → chrome → tiny) so the menu buttons stay visible.
  - **feat**(`blots-editor`): Ctrl+wheel scrolls the view without moving the cursor, clamped to the document range; the view stays put until the cursor moves again (arrow keys / click / plain wheel). Plain wheel keeps its existing behavior of actually moving the cursor one visual line per notch.
  - **deps**(`blots-editor`): adds `cfonts`, `chalk`, `gradient-string`, `oh-my-logo` (runtime) and `@types/gradient-string` (dev).
- Updated dependencies [b130db8]
  - ink-cartridge@5.1.5

## 0.0.9

### Patch Changes

- c56647b: - **fix**(`ink-cartridge`): `useMouseRegion` no longer keeps a stale mouse hit area after a terminal resize. Ink's resize path only re-lays-out the yoga tree without re-rendering React components, and `useBoxMetrics` only fires when the element's own relative metrics change — an element inside a fixed-width, centered row (e.g. a main-menu button) keeps identical relative metrics on resize while its absolute position moves, so the component never re-rendered and the engine kept the pre-resize rect (no hover/click on the new position, the old position still hit, until a mouse hit on the stale area re-rendered the component). The hook now subscribes to terminal resize unconditionally (`useWindowSize`), forcing a re-render and re-registering the rect against the fresh layout.
  - **breaking**(`ink-cartridge`): mouse-region identity renamed `elementId` → `regionId` across the API — `MouseRegionEntry.elementId`, `KeyboardEngine#unregisterMouseRegion(layerId, regionId)`, `KeyboardEngine#getHoveredMouseRegion()` returning `{ layerId, regionId }`, and `useMouseRegion` options. The old name was misleading: it suggested the id of a keyboard layer element, but regions are independent of keyboard elements. Related behavior change: `useMouseRegion` now defaults to an **auto-generated unique id** per call site instead of inheriting the surrounding layer/modal element id — reusing that id made every region in the same layer/modal collide (later registrations overwrote earlier ones, e.g. only the last language row in a picker modal was clickable). Pass `regionId` explicitly to control identity. The engine's `hitLayer` no longer gates regions on the layer's `activeElements` (a keyboard concept); a region is hit-tested whenever its layer participates in the hit order.
  - **feat**(`blots-editor`): the settings screen now opens a centered language-picker modal (white bold border, filled background) instead of spreading the language options inline — Settings → Language → picker. Keyboard and mouse both work; the mouse-click fix above (unique per-region ids) is what makes every language row clickable.
  - **fix**(`blots-editor`): the main-menu button row benefits from the core fix above — mouse hit areas realign immediately after a terminal resize.
  - **test**(`ink-cartridge`): `tests/keyboard/mouse-resize.test.tsx` gains a fixed-width centered-row layout case (mirroring the main-menu buttons) covering the "absolute position moves while own relative metrics stay fixed" scenario — it fails with the fix removed and passes with it in place; `packages/editor/tests/settings.test.tsx` updated for the modal picker flow (open / select / Esc-cancel).
- Updated dependencies [c56647b]
  - ink-cartridge@5.1.4

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
