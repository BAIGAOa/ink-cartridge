---
"ink-cartridge": patch
---

- **feat**(`ink-cartridge`): `automaticTakeoverKeyboard` now also accepts a page list (`ComponentType<any>[]`) alongside `boolean`. With a list, the layer's keyboard bindings stay active on every unlisted page and go dormant only while the current page is one of the listed pages — the list wins even when it contains the layer's host page — and they reactivate when leaving a listed page. `true` keeps the previous behavior (bindings active only on the host page); the same scoping applies to normal and modal layers via `openLayer` / `openModalLayer` options.
- **test**(`ink-cartridge`): `tests/keyboard/persistent-layer.test.tsx` covers the array scoping — multi-page lists, listing the host page, `gotoScreen` jumps, and scoped modal layers.
