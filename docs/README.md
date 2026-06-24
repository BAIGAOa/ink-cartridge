# ink-cartridge Keyboard System

## Overview

The keyboard system provides **layered key event handling** for terminal UIs, replacing the chaos of a single `useInput` with messy `if-else` chains. Each screen (and overlay) owns an independent key-binding layer. Events flow through a priority chain from top to bottom.

---

## Architecture: 7-Stage Pipeline

Every keystroke passes through 7 processor stages in order. The first stage to "consume" the event stops further processing:

```
Key Event (useInput)
    │
    ▼
┌─ ⓪ Modal ─────────────────────────────────┐  Active modal (blocks all events)
├─ ① GlobalSequence (affectOverlay: true) ─┐  Global multi-key sequences
├─ ② GlobalKey (affectOverlay: true) ──────┤  Global shortcuts (before overlays)
├─ ③ Overlay broadcast ────────────────────┤  Active overlays (ascending zIndex)
├─ ④ GlobalSequence (affectOverlay: false) ┤  Global sequences (after overlays)
├─ ⑤ GlobalKey (affectOverlay: false) ─────┤  Global shortcuts (before screen stack)
└─ ⑥ Screen stack (top → bottom) ─────────┘  Current screen → parent → … → root
    │
    ▼
 Dropped (no handler matched)
```

### Why 7 Stages

Stage ⓪ (Modal) has **absolute priority** — when a modal is active, all keyboard events are consumed by the modal layer, blocking everything below. This enforces modal semantics: the user must interact with the modal before anything else.

Stages ① and ② fire **before overlays** — register shortcuts that respond even when a dialog is open. The default `affectOverlay: false` variants (④ + ⑤) fire **after overlays** — only when no active overlay consumed the event.

Stage ③ **broadcasts** the event to all active overlays (sorted by zIndex, low to high). Each overlay is an independent keyboard layer.

Stage ⑥ walks the screen stack **top to bottom**: current screen → parent → grandparent → … → root. The first matching binding consumes the event and stops propagation.

---

## Core Mechanisms

### 1. `boundKeyboard` — Screen-Layer Bindings

The most common pattern. Register key bindings inside a screen component; bindings auto-cleanup on unmount.

```tsx
useEffect(() => {
  return boundKeyboard(['s'], () => skip(Game, {}));
}, []);
```

Supports `focusId` (bind to a named focus target), `once` (auto-unbind after first fire), `times` (require N presses), `observer` (real-time remaining-press callback), `onlyThis` (only when screen is stack-top), and `when` (dynamic on/off condition).

### 2. `globalKeys` — Global Shortcuts

Independent of the screen stack. Available on all screens (unless restricted by `category`).

```tsx
globalKeys([
  { key: 'q', operate: () => process.exit() },
  { key: 'h', operate: showHelp, affectOverlay: true },
], { mode: 'add' });
```

### 3. `blockedKey` — Let Through (Penetration)

Marks keys as transparent so they pass through the current layer to layers below.

```
Top layer:     blockedKey(['tab'])              ← tab passes through
Bottom layer:  boundKeyboard(['tab'], handleTab) ← bottom receives tab
```

> Naming note: `blockedKey` means "block this layer from handling the key" — it does NOT mean "block the key from propagating." It makes keys transparent.

### 4. `stop` — Propagation Barrier

Prevents matching keys from reaching lower layers.

```
Top layer:     stop(['escape'])                 ← escape stops here
Bottom layer:  boundKeyboard(['escape'], handleEsc) ← never receives it
```

---

## Focus System

Each screen layer maintains a set of **focus targets** identified by `focusId`. Only one focus target is active at a time within a layer.

```
Screen layer Menu:
  ├─ focusTarget: 'search' ── boundKeyboard(['a'..'z'], onSearchInput)
  │                           boundKeyboard(['escape'], clearSearch)
  │
  ├─ focusTarget: 'list'  ── boundKeyboard(['j','k'], navigateList)
  │                           boundKeyboard(['enter'], selectItem)
  │
  └─ layer-level bindings ── boundKeyboard(['tab'], focusNext)
```

Tab cycles through focus targets: `search → list → search → …`

Only the **active focus target's** bindings are evaluated. Layer-level bindings (no `focusId`) are always evaluated, but after the active focus target.

---

## Internal Event Flow per Layer

When a key event reaches a screen or modal layer, `handleLayer` evaluates in this order:

```
1. Tab/Shift+Tab focus rotation     ← highest priority (stack-top only)
2. Filter out blockedKey            ← remove "transparent" key names
3. Wildcard * priority mode (if on) ← stack-top only
4. Sequence matching (boundSequence) ← stack-top only
5. Active focus-target bindings     ← exact match + wildcard
6. Layer-level bindings             ← exact match + wildcard
7. stop check                       ← block downward propagation
```

Each step returns `true` immediately after consuming the event, skipping remaining steps.

---

## Sequence Keys

Sequences match **consecutive key presses**, like Vim's `gg` or `dd`. They have higher priority than single-key bindings.

```tsx
boundSequence(['g', 'g'], () => gotoScreen(Top));
```

Sequences have a **timeout** (default 500ms) — if not completed in time, the pending sequence is cancelled. Supports `exclusive` mode (mismatched keys are swallowed silently) and `onlyThis`/`focusId`.

Global sequences (`globalSequence`) add dimensions: `affectOverlay`, `cover`, and `category`.

---

## Design Principles

1. **Consume and stop** — Once a pipeline stage handles a key, subsequent stages never see it. Predictable behavior.

2. **Sub-threshold presses are swallowed** — In `times` mode, presses 1 through (N-1) do not fire the handler but return `true` to prevent downward propagation. Otherwise lower layers would "steal" these counting presses.

3. **Bindings cleanup on unmount** — `boundKeyboard` returns a cleanup function. When the component leaves the screen stack, React's `useEffect` teardown automatically removes all bindings.

4. **Provider nesting order matters** — `KeyboardProvider` must be nested inside `ScenarioManagementProvider`. Reversed order silently breaks keyboard functionality.

5. **Pipeline is a pure function chain** — Each processor is an independent `{ process(ctx) }` object, easy to test and extend in isolation.

---

## Related Documentation

| Document | Content |
|----------|---------|
| [keyboard.md](./keyboard.md) | Full API reference |
| [screen.md](./screen.md) | Screen navigation system |
| [theme.md](./theme.md) | Theme system |
| [language.md](./language.md) | Internationalization |
| [storage.md](./storage.md) | JSON persistence |
| [binary-storage.md](./binary-storage.md) | Binary FIFO storage |
