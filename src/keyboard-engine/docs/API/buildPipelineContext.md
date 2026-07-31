# buildPipelineContext

Build a snapshot of all mutable engine state needed to process a single key event through the pipeline.

Called internally by [`processKey`](./processKey.md) once per key event. All values are read synchronously from the engine's current state to produce a consistent frozen-in-time view. The returned `PipelineContext` is what each pipeline processor receives.

This method is useful for **testing** — you can construct a context and pass it directly to individual processors, or verify that the context reflects the expected engine state.

## Signature

```ts
buildPipelineContext(input: string, key: unknown): PipelineContext
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `input` | `string` | Raw character string from the host framework. |
| `key` | `unknown` | Full key descriptor from the host framework. |

## Returns

A `PipelineContext` snapshot object with these fields:

| Field | Type | Description |
|-------|------|-------------|
| `input` | `string` | Raw input character. |
| `key` | `unknown` | Full key descriptor. |
| `eventNames` | `string[]` | Normalized key name strings from `normalizeKeyNames`. |
| `topComponent` | `unknown \| null` | The top screen component, or `null` if the path is empty. |
| `globalKeys` | `ResolvedGlobalKeyEntry[]` | Copy of registered global keys. |
| `globalSequences` | `ResolvedGlobalSequenceEntry[]` | Copy of registered global sequences. |
| `wildcardFirst` | `boolean` | Whether wildcard-priority mode is active. |
| `pagePath` | `unknown[]` | Copy of the current screen path. |
| `allLayers` | `KeyboardLayer[]` | All open layers. |
| `allModalLayers` | `KeyboardLayer[]` | All open modal layers. |
| `layersRef` | `MutableRef` | Reference to the layers map (shared, mutable). |
| `layerKeyboardRefs` | `Map<string, LayerKeyboardLayer>` | Reference to per-layer element keyboard maps. |
| `pendingSeqRef` | `MutableRef` | Reference to the global pending sequence (shared, mutable). |
| `notifyFocusChange` | `() => void` | Callback to notify focus subscribers. |
| `notifyPendingSyncs` | `() => void` | Callback to notify pending-sync subscribers. |
| `currentMode` | `string \| null` | Active mode. |
| `conditions` | `Map<string, boolean>` | Condition map (shared, mutable). |
| `compositionEngineHandler` | `boolean` | Whether composition engine has a pending chain. |
| `compositionEngine` | `CompositionEngine` | The shared composition engine instance. |
| `autoTab` | `boolean` | Whether automatic Tab focus rotation is enabled. |
| `autoTabKey` | `string` | Normalized key name used for automatic Tab rotation. |
| `noActiveProcessor` | `string[]` | IDs of temporarily disabled built-in processors. |

## Effect

Pure read operation — does not mutate engine state. The returned snapshot includes both immutable per-event snapshots and mutable coordination fields (shared references to `layersRef`, `pendingSeqRef`, `conditions`) that processors use to communicate state changes within a single pipeline run.

## Usage

```ts
// Testing a custom processor
const ctx = engine.buildPipelineContext('a', { name: 'a', ctrl: false });
const handled = myProcessor.process(ctx);
assert(handled === true);
```

## API interactions

- **[`processKey`](./processKey.md)** — calls `buildPipelineContext` to build the snapshot, then iterates processors
- **[`sync`](./sync.md)** — the snapshot reflects the state most recently pushed by `sync`
- **[`addProcessor`](./addProcessor.md)** — custom processors receive the `PipelineContext` returned by this method
