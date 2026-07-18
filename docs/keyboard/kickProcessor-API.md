# kickProcessor / activeProcessor

Disable and re-enable individual built-in pipeline processors at runtime.

Each built-in processor (modal, overlay, global keys, etc.) can be independently suppressed with `kickProcessor` and later restored with `activeProcessor`. This is lighter than `removeProcessor` — the processor stays in the pipeline but its `process()` method returns `false` immediately, as if the stage didn't exist.

This is **per-instance** — each `KeyboardProvider` manages its own disabled list. Kicking processors in one provider does not affect others in the same process.

## Signature

```ts
// Access via useKeyboard() hook
const { kickProcessor, activeProcessor } = useKeyboard();

function kickProcessor(id: BuiltinProcessorId): boolean
function activeProcessor(id: BuiltinProcessorId): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | `BuiltinProcessorId` | The built-in processor to disable or re-enable. |

## Returns

| Method | `true` | `false` |
|--------|--------|---------|
| `kickProcessor` | Processor was active and was disabled. | Processor was already in the disabled list (no-op). |
| `activeProcessor` | Processor was disabled and was re-enabled. | Processor was not in the disabled list (no-op). |

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

## Examples

### Temporarily disable the modal barrier

When a modal fails and the user needs an escape hatch, kick the modal processor to let all keys fall through to global handlers:

```tsx
import { useKeyboard } from 'ink-cartridge';

function DebugModal() {
  const { kickProcessor, activeProcessor } = useKeyboard();

  useEffect(() => {
    kickProcessor('modal');
    return () => { activeProcessor('modal'); };
  }, []);

  // Modal is open but all keys pass through to underlying screens
}
```

### Suppress global keys in an edit mode

```tsx
function Editor() {
  const { addMode, kickProcessor, activeProcessor } = useKeyboard();

  useEffect(() => {
    addMode('edit');
    return () => {};
  }, []);

  function enterEditMode() {
    kickProcessor('global-key-screen');
    kickProcessor('global-sequence-screen');
  }

  function exitEditMode() {
    activeProcessor('global-key-screen');
    activeProcessor('global-sequence-screen');
  }
}
```

### Conditionally disable overlay broadcast

```tsx
function Dashboard() {
  const { kickProcessor, activeProcessor } = useKeyboard();

  function disableOverlays() {
    kickProcessor('overlay');
  }

  function enableOverlays() {
    activeProcessor('overlay');
  }
}
```

## Notes

- `kickProcessor` does NOT remove the processor from the pipeline — it only suppresses its runtime behavior. The processor still appears in `getProcessors()`.
- After `resetProcessors()`, the disabled list persists. Call `activeProcessor` for each kicked processor to re-enable them.
- `removeProcessor` permanently removes a processor from the pipeline; `kickProcessor` is a lighter weight toggle. Both can be used on the same processor independently — kicking a removed processor is a no-op.
- For custom processors, use [`addProcessor`](./addProcessor-API.md) / [`removeProcessor`](./removeProcessor-API.md) instead.
