# setValueSchema

Set or replace the runtime type validation schema for composition chain values.

By default, the composition context's `value` is `unknown` — every `execute` callback must cast it to the expected type. Providing a `ValueSchema` adds runtime guards: input is validated against `lastFlag`'s guard before `execute` runs, output is validated against the current `flag`'s guard after `execute` returns. Validation failures clear the pending chain and emit a `console.warn` in development.

## Signature

```ts
// On KeyboardEngine:
setValueSchema(schema: ValueSchema): void

// On CompositionEngine (engine.composition):
setValueSchema(schema: ValueSchema): void

// At construction time:
new KeyboardEngine({ normalizeKeyNames, valueSchema: { ... } })
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
| `schema` | `ValueSchema` | Guard functions keyed by flag name. Flags without a guard entry pass through silently. |

## Returns

Nothing (`void`).

## Effect

Replaces `this.valueSchema` on the `CompositionEngine`. The new schema takes effect immediately — the next composition key press will use the new guards. Calling `setValueSchema` replaces the entire schema (no merging with the previous one).

## When validation runs

For each composition key event:

1. **Input check** — before calling `execute`, if a schema is set and `lastFlag` is not `null`, the engine checks `schema[lastFlag]` against `ctx.value`. If the guard returns `false`, the chain is cleared and a warning is emitted.

2. **Output check** — after `execute` returns a result, the engine checks `schema[currentFlag]` against `result.value`. If the guard returns `false`, the chain is cleared and a warning is emitted.

## Usage

```ts
const schema: ValueSchema = {
  times: (v): v is number => typeof v === 'number',
  action: (v): v is number => typeof v === 'number',
};

// At construction
const engine = new KeyboardEngine({ normalizeKeyNames, valueSchema: schema });

// At runtime
engine.setValueSchema(schema);

// Replace entirely
engine.setValueSchema({
  count: (v): v is number => typeof v === 'number' && v > 0,
  operate: (v): v is string => typeof v === 'string',
});
```

## API interactions

- **[`registryCompositionKey`](./registryCompositionKey.md)** — the `execute` callbacks whose input/output are validated by the schema
- **[`abortComposition`](./abortComposition.md)** — when validation fails, the chain is cleared (same effect as calling `abort`)
- **[`KeyReleaseWhenChainInterrupted`](./registryCompositionKey.md)** — controls whether a validation-failing key is swallowed (propagation stops) or released to lower pipeline stages
