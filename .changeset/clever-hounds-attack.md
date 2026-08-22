---
"ink-cartridge": patch
---

- **feat**(keyboard): `useMouseRegion` gains a `ref` option — the region registers under an external object ref instead of a hook-created one, so a wrapper component can share the same ref with `boundKeyboard({ ref, focusId })` and clicks forward keyboard focus to that binding
- **feat**(keyboard): export `MouseRegionCallbacks` from the framework root
