# Condition System

Named boolean conditions for dynamic binding gating.

Unlike [modes](./mode-system.md) which represent discrete global states (normal/insert/visual), conditions are independent booleans that can be toggled at runtime. Bindings reference conditions via `when: "conditionId"` and are evaluated per key press.

Use conditions for state-driven gating that crosses mode boundaries: "isEditing", "hasSelection", "isConnected".

## API surface

```ts
addCondition(id: string, defaultVal: boolean): boolean
removeCondition(target: string): boolean
setCondition(target: string, value: boolean): boolean
```

## Method details

### addCondition

Register a named condition with an initial value. Returns `true` if registered, `false` if the id already exists.

```ts
engine.addCondition('isEditing', false);
engine.addCondition('hasSelection', false);
```

### removeCondition

Unregister a condition. Returns `true` if it existed and was removed.

```ts
engine.removeCondition('isEditing');
```

### setCondition

Update a condition's value. Bindings referencing this condition via `when: "conditionId"` use the new value on the next key event. Returns `true` if updated, `false` if not registered.

```ts
engine.setCondition('isEditing', true);
```

## Effect

Conditions are stored in `EngineState.conditions` (a `Map<string, boolean>`) and written into every `PipelineContext`. Each processor evaluates `when: "conditionId"` by looking up the id in `ctx.conditions`:

- `true` → binding is active
- `false` → binding is skipped
- id not found → skipped (treated as `false`)

The check is per-key-press, so toggling a condition takes effect immediately on the very next key event — no sync or cleanup needed.

## Usage

```ts
// Register conditions
engine.addCondition('isEditing', false);
engine.addCondition('hasSelection', false);

// Bindings gated by conditions (via when string)
engine.boundKeyboard('ctrl+s', handleSave, { when: 'isEditing' });
engine.boundKeyboard('ctrl+c', handleCopy, { when: 'hasSelection' });

// Toggle at runtime
function startEditing() {
  engine.setCondition('isEditing', true);
}
function stopEditing() {
  engine.setCondition('isEditing', false);
}
```

Conditions can also be referenced via callback `when` for more complex logic:

```ts
engine.boundKeyboard('ctrl+s', handleSave, {
  when: () => engine.getCurrentMode() === 'insert' && !isReadOnly,
});
```

## API interactions

- **[`Mode System`](./mode-system.md)** — conditions and modes serve different purposes: modes are exclusive states, conditions are independent booleans. A binding can use both `mode` and `when` simultaneously
- **[`boundKeyboard`](./boundKeyboard.md)** — `when` option supports both `"conditionId"` strings and callback functions
- **[`checkWhen`](../src/checkWhen.ts)** — the internal helper that evaluates `when` references (resolves string IDs to condition map values)
