# removeProcessor

Remove a processor from the keyboard event pipeline by its ID.

Works on both built-in and custom processors. For built-in processors, call [`resetProcessors`](#resetProcessors) afterwards to restore the default 7-stage chain (exposed as an internal helper for testing).

## Signature

```ts
function removeProcessor(processorId: string): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `processorId` | `string` | The `id` of the processor to remove. |

## Returns

`true` if the processor was found and removed, `false` if no processor with the given ID exists.

## Example

```ts
import { addProcessor, removeProcessor } from 'ink-cartridge';

addProcessor({ id: 'my-logger', process: () => false });

removeProcessor('my-logger'); // true
removeProcessor('my-logger'); // false (already removed)
```

## Notes

- `removeProcessor` is a module-level function — it mutates the global pipeline shared by all `KeyboardProvider` instances.  
- Removing a built-in processor (e.g. `'modal'`) will alter keyboard behavior application-wide. Use with caution.  
- After removing a processor, its ID can be reused immediately — `addProcessor` will accept a processor with that ID again.  
- For per-instance processors (those passed via the [`processors` prop](./KeyboardProvider-API.md#processors-prop) on `KeyboardProvider`), manage their lifecycle by changing the prop array instead — `removeProcessor` only affects the global pipeline.  
- See [`addProcessor`](./addProcessor-API.md) for details on the pipeline architecture and built-in processor IDs.
