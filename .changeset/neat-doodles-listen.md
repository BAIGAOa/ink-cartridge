---
"blots-editor": patch
---

- **fix**(`blots-editor`): backspace/delete no longer split an emoji's surrogate pair. Deleting at the edge of an emoji removes the whole glyph instead of leaving a broken half-rendering char, and `invert` (undo) restores the full code point.
- **fix**(`blots-editor`): the cursor crosses an emoji in one left/right step instead of two, and any cursor placement that would land between the halves of a surrogate pair snaps to the pair start (enforced in `Document#setCursor`, the single choke point). Typing next to an emoji can no longer produce a split pair, and vertical moves onto a line containing an emoji keep snapping to the nearest valid position, never inside a pair.
- **test**(`blots-editor`): adds roughly 80 tests for the pure text-editing core: `EditorController` (previously untested — command registry, change notifications, builtin edit/cursor/view commands, argument coercion), `TextLine` unit tests (width cache, surrogate pairs, soft-wrap segment edges), `Document` edge cases (line mutation, word movement, emoji-aware movement, soft-wrap cursor placement, scroll/page bounds), operations edge cases (empty-line joins/splits, indent/outdent variants, apply/invert round-trips via shared factories in `tests/base/_logic-helpers.ts`), and click-mapping boundary cases (gutter/wide-char/wrapped clicks).
