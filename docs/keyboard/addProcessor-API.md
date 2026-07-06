# addProcessor

Register a custom processor into the keyboard event pipeline at a specified position.

The pipeline is a fixed 7-stage chain. `addProcessor` lets you inject custom logic at any point — for logging, auditing, special key interception, or altering the default priority order.

## Signature

```ts
function addProcessor(
  processor: PipelineProcessor,
  options?: { before?: string } | { after?: string } | { index?: number }
): void
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `before` | `BuiltinProcessorId \| string` | Insert before the named processor. |
| `after` | `BuiltinProcessorId \| string` | Insert after the named processor. |
| `index` | `number` | Insert at a 0-based index position. |
| omitted | — | Append to the end of the pipeline. |

## Built-in processor IDs

The default pipeline has 7 processors in this order:

| Index | ID | Stage |
|-------|----|-------|
| 0 | `modal` | Modal — consumes everything except allowed keys |
| 1 | `global-sequence-overlay` | Global sequences (affectOverlay: true) |
| 2 | `global-key-overlay` | Global keys (affectOverlay: true) |
| 3 | `overlay` | Overlay broadcast |
| 4 | `global-sequence-screen` | Global sequences (affectOverlay: false) |
| 5 | `global-key-screen` | Global keys (affectOverlay: false) |
| 6 | `screen-stack` | Screen stack (top-to-bottom) |

Use these IDs in `before`/`after` to position your custom processor relative to any built-in stage.

## Throws

- `[ink-cartridge]` error if `processor.id` duplicates an existing processor ID.
- `[ink-cartridge]` error if the `before`/`after` target is not found.

## PipelineProcessor interface

```ts
interface PipelineProcessor {
  id: string;
  process(ctx: PipelineContext): boolean;
}
```

Return `true` to consume the event (stop propagation); return `false` to let it continue to the next processor.

## Best Practice

### Logging / auditing

Insert a no-op processor at the front to trace every keystroke:

```ts
import { addProcessor } from 'ink-cartridge';
import type { PipelineProcessor } from 'ink-cartridge';

const logProcessor: PipelineProcessor = {
  id: 'keystroke-logger',
  process(ctx) {
    console.log(`[key] ${ctx.input} | top=${ctx.topComponent?.displayName}`);
    return false; // don't consume — let the pipeline continue
  },
};

addProcessor(logProcessor, { index: 0 });
```

### Custom key interception

Insert a processor that handles a special key before the modal stage:

```ts
addProcessor({
  id: 'emergency-exit',
  process(ctx) {
    if (ctx.input === '\x03') { // Ctrl+C
      process.exit(0);
      return true;
    }
    return false;
  },
}, { before: 'modal' });
```

### Insert after a built-in stage

```ts
// Run custom logic right after the overlay stage processes a key
addProcessor(myProcessor, { after: 'overlay' });
```

## Notes

- `addProcessor` is a module-level function. Processors are registered once and persist for the lifetime of the module. Call it at module scope or during app initialization — not inside React component lifecycle.
- Duplicate ID detection runs on every call. If the processor ID already exists in the pipeline, the function throws **before** mutating the array.
- There is no `removeProcessor`. If you need dynamic add/remove at runtime, implement the filtering logic inside your processor's `process` method.
- For per-instance (scoped to a single `KeyboardProvider` subtree) custom processors, use the [`processors` prop](./KeyboardProvider-API.md#processors-prop) on `KeyboardProvider` instead.
