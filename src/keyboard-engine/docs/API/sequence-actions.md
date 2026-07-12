# Sequence Actions

Named sequence operations that decouple key chords from callback logic.

The sequence counterpart to [shortcut actions](./shortcut-actions.md). Register a named sequence action once and reference it by `sequenceActionId` in [`boundSequence`](./boundSequence.md) and [`globalSequence`](./globalSequence.md).

## API surface

```ts
defineSequenceAction(entries: SequenceOperationEntry[]): void
addSequenceAction(entry: SequenceOperationEntry): void
hasSequenceAction(sequenceActionId: string): boolean
removeSequenceAction(sequenceActionId: string): void
modifySequenceAction(sequenceActionId: string, keys: string[], timeout?: number): void
clearSequenceOperations(): void
```

### SequenceOperationEntry

| Field | Type | Description |
|-------|------|-------------|
| `sequenceActionId` | `string` | Unique identifier. |
| `action` | `() => void` | Callback to invoke when the full sequence matches. |
| `keys` | `string[]` | (Optional) Preset key sequence (≥ 2 keys). |
| `timeout` | `number` | (Optional) Preset timeout in ms. |

## Method details

### defineSequenceAction

Register multiple sequence actions at once. Throws if any `sequenceActionId` is duplicated.

```ts
engine.defineSequenceAction([
  { sequenceActionId: 'scroll-top', action: () => scrollToTop(), keys: ['g', 'g'], timeout: 600 },
  { sequenceActionId: 'quit-all', action: () => process.exit(0), keys: ['ctrl+w', 'q'] },
]);
```

### addSequenceAction

Add a single sequence action. Throws if the id already exists.

```ts
engine.addSequenceAction({ sequenceActionId: 'zoom-reset', action: () => zoom(1) });
```

### hasSequenceAction

Check registration without throwing.

```ts
if (engine.hasSequenceAction('scroll-top')) {
  engine.boundSequence('scroll-top');
}
```

### removeSequenceAction

Remove a registered sequence action. Throws if not registered.

### modifySequenceAction

Change the preset keys and/or timeout of an existing sequence action. Throws if the action doesn't exist or has no preset keys.

```ts
engine.modifySequenceAction('scroll-top', ['ctrl+home'], 400);
```

### clearSequenceOperations

Remove all registered sequence actions.

## Effect

Actions are stored in `sequenceOperationsRef` (a `Map<string, { action, keys?, timeout? }>`). Resolution happens at registration time, not at key-press time.

## Using sequence actions with bindings

```ts
engine.defineSequenceAction([
  { sequenceActionId: 'vim-scroll-top', action: () => scrollToTop(), keys: ['g', 'g'], timeout: 600 },
]);

// Reference by id
engine.boundSequence('vim-scroll-top');
engine.boundSequence(['shift+g'], 'vim-scroll-top');  // override keys locally
engine.globalSequence([{ keys: ['ctrl+home'], operate: 'vim-scroll-top' }]);
```

## Throws

- `[ink-cartridge]` on duplicate `sequenceActionId`
- `[ink-cartridge]` on `modifySequenceAction` if no preset keys/timeout
- `[ink-cartridge]` on `removeSequenceAction` if not registered

## API interactions

- **[`boundSequence`](./boundSequence.md)** — supports `boundSequence(actionId)` calling convention
- **[`globalSequence`](./globalSequence.md)** — `operate` accepts string sequence action IDs
- **[`shortcut-actions`](./shortcut-actions.md)** — the single-key equivalent; separate registry
