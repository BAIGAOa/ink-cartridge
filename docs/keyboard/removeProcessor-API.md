# removeProcessor

Remove a processor from this instance's keyboard event pipeline by its ID.

Works on both built-in and custom processors. For built-in processors, call `resetProcessors()` afterwards to restore the default 7-stage chain.

This is **per-instance** — each `KeyboardProvider` has its own pipeline. Removing a processor from one provider does not affect others in the same process.

## Signature

```ts
// Access via useKeyboard() hook
const { removeProcessor } = useKeyboard();

function removeProcessor(processorId: string): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `processorId` | `string` | The `id` of the processor to remove. |

## Returns

`true` if the processor was found and removed, `false` if no processor with the given ID exists.

## Example

```tsx
import { useKeyboard } from 'ink-cartridge';

function MyComponent() {
  const { addProcessor, removeProcessor } = useKeyboard();

  useEffect(() => {
    addProcessor({ id: 'my-logger', process: () => false });
    return () => { removeProcessor('my-logger'); };
  }, []);
}
```

## Notes

- `removeProcessor` is per-instance — call it inside a React component via `useKeyboard()`. It only affects the nearest `KeyboardProvider`'s pipeline.
- Removing a built-in processor (e.g. `'modal'`) will alter keyboard behavior for that provider instance. Use with caution.
- After removing a processor, its ID can be reused immediately — `addProcessor` will accept a processor with that ID again.
- For per-instance processors (those passed via the [`processors` prop](./KeyboardProvider-API.md#processors-prop) on `KeyboardProvider`), manage their lifecycle by changing the prop array instead.
- See [`addProcessor`](./addProcessor-API.md) for details on the pipeline architecture and built-in processor IDs.
