---
"@cartridge-engine/keyboard-engine": patch
---

Fix two keyboard-engine defects in the composition and modal subsystems:

- `undo()` now clears any in-flight composition (or mapping) chain before undoing. Previously a pending chain survived `undo()`, keeping `startPending()` from beginning a new chain until the stale timeout fired.
- The modal barrier now treats a focused element's own `when`-disabled `allowedKeys` as blocked, so a key the focused element disabled no longer penetrates the modal.
