# setValueSchema

Set or replace the runtime type validation schema for composition chains.

By default the composition context's `value` property is `unknown` — every `execute` callback must cast it to the expected type. `setValueSchema` registers guard functions that validate the value at each step: input is checked against `lastFlag`'s guard before `execute`, output is checked against the current `flag`'s guard after `execute`. When a guard fails, the engine clears the pending chain and emits a `console.warn` (development only).

## Signature

```ts
// Access via useKeyboard() hook
const { setValueSchema } = useKeyboard();

function setValueSchema(schema: ValueSchema): void
```

## Types

```ts
type ValueGuard = (value: unknown) => boolean;
type ValueSchema = Record<string, ValueGuard>;
```

A `ValueGuard` is a type predicate function — return `true` when the value matches the expected shape for the flag. The schema maps flag names to their respective guards.

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `schema` | `ValueSchema` | Guard functions keyed by flag name. Flags without a guard pass through silently. |

## Example

```tsx
import { useKeyboard } from 'ink-cartridge';

function MyComponent() {
  const { setValueSchema } = useKeyboard();

  useEffect(() => {
    setValueSchema({
      times: (v): v is number => typeof v === 'number',
      action: (v): v is number => typeof v === 'number',
    });
  }, []);
}
```

Calling `setValueSchema` replaces the entire schema — it does not merge with the previous one.

## Initial schema via KeyboardProvider

You can also supply a schema at mount time via the `valueSchema` prop on `KeyboardProvider`:

```tsx
<KeyboardProvider valueSchema={{
  times: (v): v is number => typeof v === 'number',
  action: (v): v is number => typeof v === 'number',
}}>
  <CurrentScreen />
</KeyboardProvider>
```

## Engine-level usage

When using `KeyboardEngine` directly (non-React frameworks):

```ts
engine.composition.setValueSchema({
  times: (v): v is number => typeof v === 'number',
});
```

Or via the convenience method on the engine:

```ts
engine.setValueSchema({
  times: (v): v is number => typeof v === 'number',
});
```

## Notes

- Schema can be set to `undefined` (the default) — no validation occurs, fully backward compatible.
- Guards are optional per-flag — keys with flags not present in the schema pass through without validation.
- See [`compositionEngine`](./compositionEngine-API.md#value-schema-runtime-type-validation) for the full value schema system documentation.
