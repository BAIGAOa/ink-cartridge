# removeProcessor

Remove a processor from this engine instance's pipeline by its id.

Works on both custom processors (added via [`addProcessor`](./addProcessor.md) or the constructor's `processors` option) and built-in processors. Removing a built-in processor alters keyboard behavior — for example, removing `"modal"` disables the modal barrier entirely.

This is **per-instance** — each `KeyboardEngine` manages its own pipeline.

## Signature

```ts
removeProcessor(processorId: string): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `processorId` | `string` | The `id` of the processor to remove. |

## Returns

`true` if the processor was found and removed, `false` if no processor with the given ID exists.

## Effect

Splices the processor out of the `_processors` array. The removal is immediate — the next [`processKey`](./processKey.md) call uses the updated pipeline.

After removing a built-in processor, the engine continues to function normally (no error is thrown), but the keyboard behavior for that pipeline stage is gone. Call [`resetProcessors`](./addProcessor.md#getprocessors--resetprocessors) to restore the defaults.

After removal, the processor's ID can be reused immediately — [`addProcessor`](./addProcessor.md) will accept a processor with that ID again.

## Usage

```ts
// Remove a custom processor added at runtime
engine.addProcessor({ id: 'my-logger', process: () => false });
engine.removeProcessor('my-logger');

// Remove a built-in (use with caution!)
engine.removeProcessor('modal');     // no more modal barrier
engine.resetProcessors();            // restore defaults
```

## API interactions

- **[`addProcessor`](./addProcessor.md)** — the inverse; insert processors into the pipeline
- **[`getProcessors`](./addProcessor.md#getprocessors--resetprocessors)** — inspect the pipeline before/after removal
- **[`resetProcessors`](./addProcessor.md#getprocessors--resetprocessors)** — restore all default processors after removing built-in ones
- **[`processKey`](./processKey.md)** — the consumer of the pipeline; changes take effect on the next event
