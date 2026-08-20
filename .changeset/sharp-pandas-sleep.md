---
"@cartridge-engine/keyboard-engine": patch
---

- **docs**(`@cartridge-engine/keyboard-engine`): mouse-region docs updated to match the stacked-modal hit-testing semantics shipped in the previous patch — only the topmost modal layer is consulted while any modal is open, and a miss on it is dead (no fall-through to lower modals, regular layers, or root regions). Previously the docs still described the old behavior (all modal layers hit-tested top-down). Updated in `MouseRegionService` (class and `hitTest` JSDoc), `KeyboardEngine#registerMouseRegion`, and the `MouseRegionEntry` type. No runtime changes.
