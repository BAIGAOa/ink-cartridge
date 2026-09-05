---
"@cartridge-engine/keyboard-engine": patch
"ink-cartridge": patch
---

- **feat**(keyboard-engine): pipeline processors are now ordered by `weight` — higher runs first, equal weights keep registration order via the engine-stamped `createAt`. The nine built-in stages carry default weights exported as `builtinProcessorWeights` (`modal` 8000 → `screen-stack` 0). `addProcessor` accepts an explicit `{ weight }`, or positions by `index` / `before` / `after` as sugar resolved to the weight of the targeted slot; without options a processor defaults to weight 0 (after all built-in stages).
- **feat**(keyboard-engine): new `setProcessorWeight(id, weight)` re-assigns a processor's weight at runtime and immediately re-sorts the pipeline, so applications can reorder stages without removing and re-adding them. It is also exposed through `useKeyboard()` on the React adapter.
- **refactor**(keyboard-engine): kicking/activating now toggles each processor's `active` flag — inactive stages are skipped before `process()` runs and the `noActiveProcessor` list is removed. `addProcessor` now accepts the leaner `ProcessorInput` (`id` + `process`, optional `active`); `weight` and `createAt` are injected by the engine to build the full `PipelineProcessor`.
- **breaking**(keyboard-engine): removed the `BuiltinProcessorId` union type and the `_insertRelative` export, and processor factories (`createModalProcessor`, `createCompositionProcessor`, …) now return `ProcessorInput` — weight ordering supersedes fixed-position insertion.
- **feat**(ink-cartridge): re-export `builtinProcessorWeights` and the `ProcessorInput` type from the framework root.
- **test**(keyboard-engine): add coverage for weight ordering, equal-weight registration ties, engine-stamped processor fields, inactive-processor skipping, and runtime re-weighting.
