---
"ink-cartridge": minor
---

- **feat**(`ink-cartridge`): add `bringLayerToFront` and `restoreLayerZIndex` — raise a regular layer to the top of the stack (zIndex = max + 1) or restore a raised layer to the zIndex it was opened with. Reordering replaces the layer via spread, so `elements` / `regionFocus` / `hostPage` references survive and element components never remount.
- **feat**(`ink-cartridge`): `useMouseRegion` gains raise triggers — `clickOnRise`, `dragOnRise`, `wheelOnRise`, and `enterOnRise` raise the surrounding regular layer before the user's own callback runs, and `leaveOffRise` restores it on hover leave (only applies with `enterOnRise`; defaults `true`). Ineffective on modal layers and outside any layer.
- **fix**(`ink-cartridge`): layer reorders forced every layer element's binding effect to re-bind against the owner stack's top (the last-mounted sibling), silently moving bindings into a ghost element slot that the pipeline never visits. `useKeyboard` now temporarily declares its own owner for every binding and focus call, so keyboard ownership follows the current layer order across raises, restores, and other layer mutations.
- **fix**(`ink-cartridge`): `MouseRegionOptions` was value-exported from `src/keyboard/index.ts`, crashing module loading when running sources directly with `npx tsx`.
- **test**(`ink-cartridge`): `tests/screens/base/bringToFront.test.tsx` covers raise/restore reducer behavior (ordering, reference preservation, top-layer and unknown-ID no-ops, modal isolation); `tests/keyboard/click-rise.test.tsx` covers click-triggered raising and keyboard routing; `tests/keyboard/owner-rebind.test.tsx` pins rebind ownership; `tests/keyboard/rise-restore.test.tsx` pins keyboard ownership across raise/restore round trips.
