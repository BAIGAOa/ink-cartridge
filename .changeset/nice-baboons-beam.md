---
"ink-cartridge": minor
"@cartridge-engine/confirm-dialog": patch
"@cartridge-engine/keyboard-engine": patch
---

### boundSequence: third calling convention — explicit keys + sequence action id

`boundSequence` now supports `boundSequence(keys, actionId, options?)` alongside the existing explicit-keys+callback and action-id forms. The action's callback is resolved at registration time; its preset timeout acts as a default, overridable per call. The action does **not** need preset keys in this form, and the explicit keys take precedence over any preset ones. Type signatures updated across `KeyboardEngine`, `KeyboardContextValue`, and the React `useKeyboard` adapter (including `SequenceReactOptions` for `ref`-based region focus).

### boundSequence focusId creates its focus target

A `focusId`-scoped `boundSequence` now lazily creates (and auto-activates, when first) the focus target on its layer — matching `boundKeyboard`. Previously the sequence's focus filtering could never match because `currentFocusIds` stayed empty, and `focusSet` on such an id threw "focus target not found".

### Region focus: mouse → keyboard focus convergence

Clicking a mouse region (`useMouseRegion`) now forwards keyboard focus to the `focusId` recorded by a `boundKeyboard`/`boundSequence` `{ ref, focusId }` call, so the mouse and the keyboard converge on one focus target. Forwarding runs before the user's own `onClick`, and components react via `useFocusState`.

- `clickOnFocus` (default `true`) — click forwards focus; set `false` to keep clicks purely on the mouse callbacks
- `enterOnFocus` — hover enter forwards focus
- `leaveOffFocus` (default `true`, only when `enterOnFocus` is set) — hover leave clears focus via `kickFocusGroup`; `false` keeps it
- Layer/modal scoping mirrors keyboard ownership: the owning element's `regionFocus` map is resolved and the element id is injected, so regions inside layers and modals forward correctly
- Region entries no longer carry a transient `focused` flag
- New public types: `RegionFocusEntry`, `RegionFocusMap`, `Page`, `FocusRef`, `SequenceReactOptions`

### Keyboard engine: reference-counted region-focus entries

`registerMouseRegion`'s ref → focusId entries are reference-counted per map, so a ref shared by several bindings is only released when the last binding unbinds.

### confirm-dialog

Test mocks updated for the `regionFocus` field on layer/modal state.
