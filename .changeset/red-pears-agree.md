---
"@cartridge-engine/keyboard-engine": patch
---

- **feat**(keyboard-engine): runtime pipeline management is now O(1) per id lookup instead of scanning the whole pipeline, so applications that add, remove, or re-weight processors on the fly no longer pay a full flatten-and-walk per call. An id-keyed `processorIndex` maps each processor id to its processor and the stage holding it — covering `addProcessor`'s duplicate check and its `before`/`after` target lookup, `removeProcessor`, `kickProcessor`, and `activeProcessor` — and a lazily built flattened snapshot is cached for `getProcessors` so repeated introspection skips re-flattening. Both caches are invalidated when the pipeline's structure changes (add / remove / re-weight / reset) and kept across `active` toggles, which never change the shape. No public API or runtime behavior change.
  - **docs**(keyboard-engine): pipeline JSDoc resynced to the cached internals — the `PipelineManager` class docs describe the two caches and their invalidation rules, `getProcessors` documents that it still returns a fresh copy of the cached flatten, `activeProcessor` now names `addProcessor` and `setProcessorWeight` alongside `removeProcessor`/`resetProcessors` as the operations that alter the pipeline, and `EngineState._processors` notes it must only be mutated through `PipelineManager`.
  - **test**(keyboard-engine): existing pipeline suites (`pipeline-stage`, `pipeline-weight`, `integration/pipeline`) pass unchanged — the optimization is behavior-preserving; `getProcessors` keeps its fresh-array-per-call contract.

