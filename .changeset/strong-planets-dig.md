---
"@cartridge-engine/keyboard-engine": minor
"ink-cartridge": minor
---

- **feat**(composition): add a `cancelled` mapping-key event so subscribers can clear a "waiting for the next key" state when a mapping sequence is dropped by its timeout, by `abort()`, or by `undo()`. A timeout was previously silent, making it indistinguishable from a sequence still in progress.
- **fix**(composition): record a mapped target chain in the undo history, one entry per target key, exactly as if the user had typed those keys. A chain that fired through `addMapping` used to be un-undoable, so `undo` behaved differently depending on how the same keys were triggered.
- **fix**(composition): cancel a pending mapping sequence in `abort()`. A half-typed prefix stayed armed, so `g` → Escape → `h` still fired the `g h` mapping after the abort.
- **fix**(composition): clear the recorded history after buffering it, so a chain is never recorded twice. Calling `abort()` after a chain had already completed on timeout duplicated the entry, and `undo` then replayed its `undoAction` more than once.
- **fix**(composition): honour the `timeout` declared on a mapping entry. It was silently replaced by the engine-wide default, so a tighter timeout never took effect and a slower key sequence still matched.
- **fix**(composition): drop a partial chain rejected by a `when` condition without recording it, matching how a broken match or a failed value guard behaves. A chain is only undoable once it reaches a terminal state (timeout, end key, `execute` returning `null`, or an explicit abort).

