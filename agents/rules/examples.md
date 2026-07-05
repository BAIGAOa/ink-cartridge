---
name: examples
description: Conventions for example files under examples/ — naming, structure, and content rules
paths: ["examples/**/*"]
---

## Naming

Every demo file must follow `{ComponentName}[.{variant}].demo.tsx`:

- `Badge.demo.tsx` — single demo for Badge component
- `Theme.typed.demo.tsx` — "typed" variant of Theme demo
- `SearchBar.multi.demo.tsx` — "multi" variant of SearchBar demo

Each component lives in its own directory: `examples/<component-name>/<Demo>.demo.tsx`.

## Content

- One demo file per component variant. Split different modes into separate files (e.g. single vs. multi).
- All text (labels, descriptions, UI strings) must be in English. No Chinese characters.
- Prefer JSX over `React.createElement`.
- Demos are single-API showcases. For multi-system stress tests, use `ink-blots/`.

## Imports

Import from the public API (`../../src/index.js`) or from deep component paths. Either is acceptable as long as it's consistent within the file.

## No tests in examples/

Files ending in `_test.ts(x)` do not belong in `examples/`. Tests go in `tests/`.

## Entry in README

Every new demo must be added to `examples/README.md` with its component name and run command.
