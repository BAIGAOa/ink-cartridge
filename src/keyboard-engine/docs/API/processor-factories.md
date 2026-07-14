# Processor Factories

Create built-in pipeline processors for custom pipeline assembly. Each factory returns a `PipelineProcessor` object with an `id` and `process(ctx)` method. Use these when you need to construct a pipeline outside the default 9-stage chain — e.g. for testing individual stages, or building a custom pipeline order.

All factories are exported from `@cartridge-engine/keyboard-engine`.

## createModalProcessor

```ts
function createModalProcessor(): PipelineProcessor
```

Processor ID: `"modal"`

Creates the modal barrier stage. When a modal is active, this processor:
- Consumes every key event except keys in the `allowedKeys` list
- Offers allowed keys to the active modal layer via `handleLayer`
- Triggers `useModalMissListener` callbacks for consumed keys

**Usage:**

```ts
import { createModalProcessor } from '@cartridge-engine/keyboard-engine';

const modalProcessor = createModalProcessor();
// modalProcessor.id === "modal"
// pipeLine.push(modalProcessor);
```

## createCompositionProcessor

```ts
function createCompositionProcessor(config: { affectOverlay: boolean }): PipelineProcessor
```

Processor IDs: `"composition-overlay"` / `"composition-screen"`

Creates a composition key-chain processor. Two instances are used in the default pipeline — one for the overlay phase (`affectOverlay: true`) and one for the screen phase (`affectOverlay: false`). Both read from the shared `CompositionEngine` instance.

## createGlobalSequenceProcessor

```ts
function createGlobalSequenceProcessor(config: { affectOverlay: boolean }): PipelineProcessor
```

Processor IDs: `"global-sequence-overlay"` / `"global-sequence-screen"`

Creates a processor for global multi-key sequences. Handles pending-sequence state, timeout management, sequence disambiguation, and `exclusive` mode key consumption.

## createGlobalKeyProcessor

```ts
function createGlobalKeyProcessor(config: { affectOverlay: boolean }): PipelineProcessor
```

Processor IDs: `"global-key-overlay"` / `"global-key-screen"`

Creates a processor for global single-key bindings. Iterates registered global keys filtered by `affectOverlay`, evaluating `executeWhenNoOverlay`, `cover`, `category`, `times`, and `when` constraints.

## createOverlayProcessor

```ts
function createOverlayProcessor(): PipelineProcessor
```

Processor ID: `"overlay"`

Creates the overlay broadcast stage. Iterates all active overlays (sorted by zIndex) and offers the event to each via `handleLayer`. Unlike other processors, this stage does NOT stop on the first consumer — every active overlay receives the event.

## createScreenStackProcessor

```ts
function createScreenStackProcessor(): PipelineProcessor
```

Processor ID: `"screen-stack"`

Creates the screen stack stage. Only runs when no overlay consumed the event. Iterates the screen path from top to bottom, offering the event to each layer. The first layer that returns `true` stops iteration.
