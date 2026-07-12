# processKey

Run a keyboard event through the full 9-stage processor pipeline and return whether any processor consumed it.

This is the entry point for all keyboard events. The host framework forwards raw key events here; the engine builds a snapshot context from its current state, then runs each pipeline processor in order. The first processor to return `true` stops the chain.

## Signature

```ts
processKey(input: string, key: unknown): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `input` | `string` | Raw character string from the host framework's keyboard event. |
| `key` | `unknown` | Full key descriptor from the host framework (shape defined by [`normalizeKeyNames`](./constructor.md)). |

## Returns

`true` if any processor consumed the event, `false` if the event fell through the entire pipeline.

## Effect

For each call:

1. **Builds** a snapshot context via [`buildPipelineContext`](./buildPipelineContext.md) — captures current path, overlays, modals, global keys, layers, mode, conditions, composition engine state. All reads are synchronous to produce a frozen-in-time view.
2. **Runs** each processor in the pipeline array (`_processors`) in order:
   ```
   modal → composition (affectOverlay:true) → global sequence (ao:true) →
   global keys (ao:true) → overlay broadcast → composition (ao:false) →
   global sequence (ao:false) → global keys (ao:false) → screen stack
   ```
3. **Stops** at the first processor that returns `true` (event consumed).
4. **Notifies** pending sync callbacks — callers of [`thereGlobalQueueWaiting`](./thereGlobalQueueWaiting.md) and [`currentScreenHasSequenceWaiting`](./currentScreenHasSequenceWaiting.md) that passed a `sync` function get notified so the host framework can re-render.

Side effects are produced by the individual processors — `processKey` itself only orchestrates the chain. Processors may mutate layers (add/remove bindings via `once: true`), update pending sequence state, focus targets, composition context, or press-count counters.

## Usage

```ts
// Engine-level: call for every key event from the host framework
useInput((input, key) => {
  const handled = engine.processKey(input, key);
  if (!handled) {
    // Key fell through the entire pipeline — host may handle it or ignore
  }
});
```

The host framework adapter is responsible for calling [`sync`](./sync.md) before forwarding any key events.

## API interactions

- **[`sync`](./sync.md)** — must be called before `processKey` each render, or the pipeline snapshot is stale
- **[`cleanLayers`](./cleanLayers.md)** — should be called after `processKey` (in a post-render effect) to remove stale layers
- **[`buildPipelineContext`](./buildPipelineContext.md)** — called internally to build the snapshot context; can be called independently for testing
- **[`addProcessor`](./addProcessor.md)** — insert custom processors into the pipeline processed by `processKey`
- **[`removeProcessor`](./removeProcessor.md)** — remove processors from the pipeline
- **[`thereGlobalQueueWaiting`](./thereGlobalQueueWaiting.md)** / **[`currentScreenHasSequenceWaiting`](./currentScreenHasSequenceWaiting.md)** — sync callbacks registered by these APIs are notified after `processKey` completes
