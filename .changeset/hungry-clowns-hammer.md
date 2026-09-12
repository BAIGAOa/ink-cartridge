---
"@cartridge-engine/keyboard-engine": patch
"ink-cartridge": patch
---

- **feat**(keyboard-engine): the processor pipeline is now a list of **stages** — processors that share a `weight` form one stage, and stages stay sorted by weight (higher runs first). This replaces the flat, strictly-ordered chain introduced with weight ordering.
- **breaking**(keyboard-engine): `processKey` consumes a stage as a whole — every active member observes the event in insertion order, and the stage counts as consumed when any of them returns `true`. A processor that returns `true` no longer stops its same-stage siblings, so equal-weight processors are no longer mutually exclusive.
- **breaking**(keyboard-engine): `addProcessor` positions in stage terms — `{ index }` is now a 0-based **stage** slot (it used to be a processor slot), and `{ before }` / `{ after }` insert a new stage just above/below the stage holding the named processor instead of resolving to a processor-level offset.
- **feat**(keyboard-engine): an out-of-range `{ index }` now throws `[ink-cartridge] Cannot insert processor "…" at index …` instead of silently falling back to weight 0.
- **feat**(keyboard-engine): `setProcessorWeight` relocates a processor between stages — it joins the stage that already carries the target weight, or opens a new one — and drops the stage it leaves empty. `removeProcessor` likewise removes only the target from its stage and drops the stage once it is empty, so removing one member of a shared stage no longer takes its siblings with it.
- **breaking**(keyboard-engine): drop the engine-stamped `createAt` field from `PipelineProcessor` and the internal registration counter. Equal weights are no longer tie-broken by registration order; they share a stage and run in insertion order.
- **docs**(keyboard-engine): pipeline JSDoc resynced to the stage model — `addProcessor`, `setProcessorWeight`, `processKey`, `getProcessors`, `kickProcessor`, `PipelineProcessor`, `ProcessorInput`, `KeyboardProcessorProps`, `builtinProcessorWeights`, and `EngineState`.
- **test**(keyboard-engine): add `tests/engine/base/pipeline-stage.test.ts` covering stage grouping, stage-atomic consumption (including consumption from the final stage), stage-based `index`/`before`/`after`, out-of-range index errors, and stage relocation/removal; update `pipeline-weight.test.ts` for the removed `createAt`.
- **breaking**(ink-cartridge): the re-exported pipeline types follow the stage model — `PipelineProcessor` no longer carries `createAt`, and `KeyboardProcessorProps.index` positions by stage slot.
- **docs**(ink-cartridge): the `KeyboardProvider` `processors` prop JSDoc now describes stage-slot positioning, and its example passes a valid `ProcessorInput` (the old example used a top-level `id` field that never existed on `KeyboardProcessorProps`).
