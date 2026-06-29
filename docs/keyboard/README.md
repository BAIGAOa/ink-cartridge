# Keyboard System

## Why

Terminal UIs have no DOM events — no `onClick`, no event bubbling, no `z-index`. Ink gives you one primitive: `useInput(input, key)`. The keyboard system builds a layered event engine on top, letting every screen, overlay, and modal manage its own shortcuts independently while a predictable priority chain resolves conflicts.

The rule: **each layer minds its own keys; the chain decides who wins.**

## Architecture

```
useInput (Ink)
    │
    ▼
KeyboardProvider — owns a useRef Map of all layers
    │
    ▼
7-stage Pipeline (highest to lowest priority):
  0. Modal              (consumes everything except allowed keys)
  1. GlobalSequence     (affectOverlay: true)
  2. GlobalKeys         (affectOverlay: true)
  3. Overlay broadcast  (all active overlays receive in parallel)
  4. GlobalSequence     (affectOverlay: false)
  5. GlobalKeys         (affectOverlay: false)
  6. Screen stack       (top-to-bottom, first match wins)
```

Each stage is an independent processor. The first to return `true` consumes the event. The only exception is stage 3 (overlay broadcast), which always returns `false` to let the chain continue.

## API Index

| API | Purpose |
|-----|---------|
| [KeyboardProvider](./KeyboardProvider-API.md) | Mount the keyboard engine |
| [useKeyboard](./useKeyboard-API.md) | Access all layer methods |
| [boundKeyboard](./boundKeyboard-API.md) | Per-layer single-key binding |
| [boundSequence](./boundSequence-API.md) | Per-layer multi-key sequence |
| [blockedKey](./blockedKey-API.md) | Mark keys as transparent (pass-through) |
| [stop](./stop-API.md) | Block keys from propagating down |
| [globalKeys](./globalKeys-API.md) | Global single-key bindings |
| [globalSequence](./globalSequence-API.md) | Global multi-key sequences |
| [Focus system](./focus-system-API.md) | focusSet / focusNext / focusPrev / useFocusState / focusUnregister |
| [Shortcut actions](./shortcut-actions-API.md) | Named operations: defineShortcutAction / addAction / modifyAction etc. |
| [Sequence actions](./sequence-actions-API.md) | Named sequence operations: defineSequenceAction / addSequenceAction etc. |
| [allowModal](./allowModal-API.md) | Let keys pass through the modal barrier |
| [useModalMissListener](./useModalMissListener-API.md) | Listen for unhandled keys inside a modal |
| [enableWildcardPriority](./enableWildcardPriority-API.md) | Absolute priority for `*` wildcard bindings |

## Advanced

See [advanced.md](./advanced.md)
