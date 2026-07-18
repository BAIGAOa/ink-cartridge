# kickProcessor / activeProcessor

Disable and re-enable individual built-in pipeline processors at runtime without removing them from the pipeline.

When a processor is kicked, it is added to a disabled list (`noActiveProcessor` in `EngineState`). On the next [`processKey`](./processKey.md) call, the processor's `process()` method checks this list and returns `false` immediately — the key event falls through to the next pipeline stage as if the kicked processor didn't exist.

This is **per-instance** — each `KeyboardEngine` manages its own disabled list independently.

## Signature

```ts
kickProcessor(id: BuiltinProcessorId): boolean
activeProcessor(id: BuiltinProcessorId): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | `BuiltinProcessorId` | The built-in processor to disable or re-enable. |

## Returns

| Method | `true` | `false` |
|--------|--------|---------|
| `kickProcessor` | Processor was active and was added to the disabled list. | Processor was already in the disabled list (no-op). |
| `activeProcessor` | Processor was in the disabled list and was removed from it. | Processor was not in the disabled list (no-op). |

## Effect

`kickProcessor` pushes the processor ID into `EngineState.noActiveProcessor`. During [`buildPipelineContext`](./buildPipelineContext.md), this array is passed to the `PipelineContext` as `noActiveProcessor`. Each built-in processor factory (`createModalProcessor`, `createGlobalKeyProcessor`, etc.) checks `ctx.noActiveProcessor.includes(this.id)` as the first guard in its `process()` method.

`activeProcessor` splices the processor ID out of `EngineState.noActiveProcessor`. The processor resumes normal operation on the next `processKey` call.

Neither method changes the `_processors` array — [`getProcessors`](./addProcessor.md#getprocessors--resetprocessors) returns the same list regardless of kick/activate state. Only `removeProcessor` and `resetProcessors` alter the pipeline array.

## Built-in processor IDs

| ID | Stage |
|----|-------|
| `modal` | Modal barrier |
| `composition-overlay` | Composition chains (affectOverlay: true) |
| `global-sequence-overlay` | Global sequences (affectOverlay: true) |
| `global-key-overlay` | Global keys (affectOverlay: true) |
| `overlay` | Overlay broadcast |
| `composition-screen` | Composition chains (affectOverlay: false) |
| `global-sequence-screen` | Global sequences (affectOverlay: false) |
| `global-key-screen` | Global keys (affectOverlay: false) |
| `screen-stack` | Screen stack (top-to-bottom) |

## Usage

```ts
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';

const engine = new KeyboardEngine({
  normalizeKeyNames: (input: string, _key: unknown) => (input ? [input] : []),
});

engine.sync({
  path: ['screen'],
  activeOverlayIds: [],
  displayedOverlays: [],
  activeModalId: null,
  displayedModals: [],
});
const handler = vi.fn();
engine.boundKeyboard(['x'], handler);

engine.kickProcessor('screen-stack');
engine.processKey('x', {}); // handler NOT called — screen-stack skipped

engine.activeProcessor('screen-stack');
engine.processKey('x', {}); // handler IS called — screen-stack restored
```

## API interactions

- **[`removeProcessor`](./removeProcessor.md)** — permanently removes the processor from the pipeline array (vs. kicking which only disables it). Kicking a removed processor is a no-op.
- **[`addProcessor`](./addProcessor.md)** — can add a processor while another is kicked; the new processor is unaffected.
- **[`resetProcessors`](./addProcessor.md#getprocessors--resetprocessors)** — rebuilds the default `_processors` array but does NOT clear `noActiveProcessor`. Kicked processors remain disabled after reset; call `activeProcessor` to re-enable.
- **[`getProcessors`](./addProcessor.md#getprocessors--resetprocessors)** — returns all processors regardless of kick state.
- **[`processKey`](./processKey.md)** — the consumer; kicked processors are skipped on every event.
- **[`buildPipelineContext`](./buildPipelineContext.md)** — reads `noActiveProcessor` from `EngineState` and passes it to every processor's `process()` method.
