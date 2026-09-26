---
"@cartridge-engine/keyboard-engine": patch
---

- **refactor**(keyboard-engine): mouse hit-testing no longer builds and sorts a candidate array on every event — `hitLayer` scans a layer's regions in place, dropping the per-hit `O(R log R)` sort and `O(R)` allocation. `Map` insertion order already encodes registration order, so `>=` on priority reproduces the old (priority desc, registration order desc) tie-break exactly. The verbatim-duplicate `hitRoot` and the now-unused `hitCandidates` are gone, and `hitTest`'s modal branch collapses to a single return — a miss on the top modal is still dead, no fall-through. Public API and behavior are unchanged.
