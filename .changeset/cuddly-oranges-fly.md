---
"@cartridge-engine/keyboard-engine": patch
"blots-editor": patch
"ink-cartridge": patch
"@cartridge-engine/badge": patch
"@cartridge-engine/confirm-dialog": patch
"@cartridge-engine/divider": patch
"@cartridge-engine/fold": patch
"@cartridge-engine/form": patch
"@cartridge-engine/key-hint": patch
"@cartridge-engine/number-input": patch
"@cartridge-engine/progress-bar": patch
"@cartridge-engine/search-bar": patch
"@cartridge-engine/search-input": patch
"@cartridge-engine/select": patch
"@cartridge-engine/spinner": patch
"@cartridge-engine/tabs": patch
"@cartridge-engine/text-input": patch
---

- **fix**(`ink-cartridge`): `useMouseRegion` no longer keeps a stale mouse hit area when an element's **absolute position** changes while its own relative layout stays fixed — e.g. a child control inside a draggable modal frame. The rect was previously re-measured only during render, so after dragging a modal frame the frame re-registered its new rect while the overlapping children (sensitivity bar, language rows) kept the pre-move rect: a press on the bar hit the frame instead, and the frame followed the cursor. The hook now subscribes to Ink's root layout listeners (the same `internal_layoutListeners` set `useBoxMetrics` uses) and re-measures unconditionally after every layout commit, so region rects follow ancestor moves even when the component never re-renders — which React's children bailout (unchanged element reference) and `useBoxMetrics` (own relative metrics only) both previously prevented.
- **fix**(`blots-editor`): dragging the language / sensitivity modal frame no longer breaks the controls inside it — after moving the frame once, pressing and dragging the sensitivity bar (or clicking a language row) hits the control instead of re-dragging the frame.
- **test**(`ink-cartridge`): `tests/keyboard/mouse-ancestor-move.test.tsx` reproduces the reported scenario — an absolutely-positioned draggable frame with an overlapping child region. It fails with the fix removed (a click at the child's new position lands on the frame) and passes with it in place.
