---
"@cartridge-engine/keyboard-engine": patch
---

- **fix**(`@cartridge-engine/keyboard-engine`): with **stacked modal layers** open, mouse hit-testing now consults **only the topmost modal layer**. Previously it walked every modal layer from the top down, so a click on a lower modal's still-visible region (e.g. its Cancel button sticking out past the top modal) fired that lower modal's callbacks even though the top modal was meant to take over mouse input. This matches the keyboard side, where the modal processor has always offered events to the topmost modal layer only. While any modal is open, an event that misses the top modal is dead — it never falls through to lower modals, regular layers, or root regions.

- **test**(`@cartridge-engine/keyboard-engine`): new integration test `tests/integration/stacked-modal-mouse-regions.test.ts` reproduces the stacked-modal scenario (offset modal layers, each with a body and a Cancel-button region): clicks/hover/wheel over a lower modal's visible button are ignored, the topmost modal's button wins over its own body via `priority`, closing the topmost modal promotes the next one, and the modal barrier still blocks fall-through to regular layers. The test fails against the previous behavior and against mutations of the fix, and passes with it in place.
