# addProcessor

Insert a custom processor into the keyboard event pipeline at a specified position.

The pipeline is a fixed 9-stage chain. `addProcessor` lets you inject custom logic at any point — for logging, auditing, special key interception, or altering the default priority order.

Unlike the old global `addProcessor`, this is **per-instance**: each `KeyboardProvider` has its own pipeline. Processors added via one provider do not affect others in the same process.

## Signature

```ts
// Access via useKeyboard() hook
const { addProcessor } = useKeyboard();

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

The default pipeline has 9 processors in this order:

| Index | ID | Stage |
|-------|----|-------|
| 0 | `modal` | Modal — consumes everything except allowed keys |
| 1 | `composition-overlay` | Composition stage (affectOverlay: true) |
| 2 | `global-sequence-overlay` | Global sequences (affectOverlay: true) |
| 3 | `global-key-overlay` | Global keys (affectOverlay: true) |
| 4 | `overlay` | Overlay broadcast — always returns `false` |
| 5 | `composition-screen` | Composition stage (affectOverlay: false) |
| 6 | `global-sequence-screen` | Global sequences (affectOverlay: false) |
| 7 | `global-key-screen` | Global keys (affectOverlay: false) |
| 8 | `screen-stack` | Screen stack (top-to-bottom) |

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

```tsx
import { useKeyboard } from 'ink-cartridge';
import type { PipelineProcessor } from 'ink-cartridge';

function useKeystrokeLogger() {
  const { addProcessor } = useKeyboard();

  useEffect(() => {
    const logProcessor: PipelineProcessor = {
      id: 'keystroke-logger',
      process(ctx) {
        console.log(`[key] ${ctx.input}`);
        return false; // don't consume — let the pipeline continue
      },
    };
    addProcessor(logProcessor, { index: 0 });
    return () => { /* removeProcessor('keystroke-logger') if needed */ };
  }, []);
}
```

### Custom key interception

Insert a processor that handles a special key before the modal stage:

```tsx
const { addProcessor } = useKeyboard();
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

```tsx
// Run custom logic right after the overlay stage processes a key
addProcessor(myProcessor, { after: 'overlay' });
```

## Notes

- `addProcessor` is per-instance — call it inside a React component via `useKeyboard()`. The processor is scoped to the nearest `KeyboardProvider`.
- Duplicate ID detection runs on every call. If the processor ID already exists in the pipeline, the function throws **before** mutating the array.
- Use [`removeProcessor`](./removeProcessor-API.md) to dynamically remove a processor from the pipeline at runtime.
- For per-instance (scoped to a single `KeyboardProvider` subtree) custom processors at initialization time, use the [`processors` prop](./KeyboardProvider-API.md#processors-prop) on `KeyboardProvider` instead.
