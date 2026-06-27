# ink-blots

Stress-testing ink-cartridge through real (but tiny) TUI apps. Each subdirectory is one app that combines multiple systems — if it breaks, we found a bug.

The name comes from the **Rorschach inkblot test**: you stare at the blot (the app), and what surfaces isn't about the ink — it's the bugs hiding in the framework underneath.

## ink-blots vs examples/

- `examples/` — single-API demos. "Here's how `SelectInput` works."
- `ink-blots/` — multi-system apps. "Here's `SelectInput` inside an overlay, with a modal open, while a global sequence is pending. Does it still work?"

Examples teach. Ink-blots break things.

## What each project targets

| Project | Primary | Also hits |
|---|---|---|
| **snake** | rapid input, lifecycle | overlay (pause), ConfirmDialog |
| **form-wizard** | Form + Field + validation | NumberInput edges, ConfirmDialog |
| **dungeon** | deep nav, gotoScreen | back(levels), overlay |
| **text-adventure** | SearchInput, sequences | disambiguation, nav |
| **tower-defense** | everything at once | — |

Each project's README logs bugs found, how to reproduce, and whether they're fixed.

## Contributing

Don't write new projects. **Play the existing ones.** Then report:

- **Bugs** — crashes, wrong behavior, stuck states. Steps to reproduce.
- **Bad UX** — a key that should work but doesn't, confusing flow, unexpected behavior.

Open an issue with the label `ink-blots` and tag which project you were running.

## Run

```bash
npx tsx ink-blots/snake/index.tsx
```
