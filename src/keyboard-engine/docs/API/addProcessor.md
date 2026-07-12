# addProcessor

Insert a custom processor into this engine instance's keyboard event pipeline.

The pipeline is a 9-stage chain of `PipelineProcessor` objects. `addProcessor` lets you inject custom logic at any position — for logging, auditing, special key interception, or altering the default priority order. This is **per-instance**: each `KeyboardEngine` manages its own pipeline independently.

For injecting processors at construction time, use the [`processors` prop](./constructor.md) instead.

## Signature

```ts
addProcessor(processor: PipelineProcessor, options?: {
  before?: BuiltinProcessorId | (string & {});
} | {
  after?: BuiltinProcessorId | (string & {});
} | {
  index?: number;
}): void
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `before` | `string` | Insert before the named processor. |
| `after` | `string` | Insert after the named processor. |
| `index` | `number` | Insert at 0-based index position. |
| omitted | — | Append to the end of the pipeline. |

## Built-in processor IDs

The default pipeline has 9 processors in this order:

| Index | ID | Stage |
|-------|----|-------|
| 0 | `modal` | Modal barrier |
| 1 | `composition-overlay` | Composition chains (affectOverlay: true) |
| 2 | `global-sequence-overlay` | Global sequences (affectOverlay: true) |
| 3 | `global-key-overlay` | Global keys (affectOverlay: true) |
| 4 | `overlay` | Overlay broadcast |
| 5 | `composition-screen` | Composition chains (affectOverlay: false) |
| 6 | `global-sequence-screen` | Global sequences (affectOverlay: false) |
| 7 | `global-key-screen` | Global keys (affectOverlay: false) |
| 8 | `screen-stack` | Screen stack (top-to-bottom) |

## PipelineProcessor interface

```ts
interface PipelineProcessor {
  id: string;
  process(ctx: PipelineContext): boolean;
}
```

Return `true` to consume the event (stop propagation); return `false` to let it continue.

## Returns

Nothing (`void`).

## Effect

Mutates the `_processors` array on the engine instance. The insertion uses `insertRelative`, which creates a new array. The next call to [`processKey`](./processKey.md) uses the updated pipeline.

## Usage

```ts
// Logging — insert at front to trace every keystroke
engine.addProcessor({
  id: 'keystroke-logger',
  process(ctx) {
    console.log(`[key] input=${ctx.input} names=${ctx.eventNames}`);
    return false; // don't consume
  },
}, { index: 0 });

// Intercept before modal
engine.addProcessor({
  id: 'emergency-exit',
  process(ctx) {
    if (ctx.input === '\x03') { process.exit(0); return true; }
    return false;
  },
}, { before: 'modal' });

// Run after overlay stage
engine.addProcessor(myAuditProcessor, { after: 'overlay' });
```

## Throws

- `[ink-cartridge]` if `processor.id` duplicates an existing processor ID
- `[ink-cartridge]` if the `before`/`after` target is not found in the pipeline

## API interactions

- **[`removeProcessor`](./removeProcessor.md)** — remove a previously added processor
- **[`getProcessors`](./addProcessor.md#getProcessors)** — inspect the current pipeline
- **[`resetProcessors`](./addProcessor.md#resetProcessors)** — restore the default pipeline
- **[`constructor`](./constructor.md)** — `processors` option injects processors at construction time (equivalent to calling `addProcessor` before any events)
- **[`processKey`](./processKey.md)** — the consumer of the pipeline; custom processors run on every key event

---

## getProcessors / resetProcessors

```ts
getProcessors(): readonly PipelineProcessor[]
resetProcessors(): void
```

### getProcessors

Return a read-only snapshot of the current processor pipeline. Useful for debugging and introspection.

### resetProcessors

Restore the processor pipeline to the default 9-stage chain. Removes all custom processors. Any processor state they held is lost.

```ts
engine.resetProcessors();
```

Use this after tests or when you need to revert runtime configuration changes.
