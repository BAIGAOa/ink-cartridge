# Shortcut Actions

Named shortcut operations that decouple key bindings from callback logic.

Instead of passing inline callbacks to [`boundKeyboard`](./boundKeyboard.md) and [`globalKeys`](./globalKeys.md), register a named action once and reference it by `actionId` everywhere. This lets you change keys without touching every binding site, and inspect/manage actions at runtime.

## API surface

```ts
defineShortcutAction(entries: ShortcutOperationEntry[]): void
addAction(entry: ShortcutOperationEntry): void
hasAction(actionId: string): boolean
removeAction(actionId: string): void
modifyAction(actionId: string, keys: string[]): void
clearShortcutOperations(): void
```

### ShortcutOperationEntry

| Field | Type | Description |
|-------|------|-------------|
| `actionId` | `string` | Unique identifier. |
| `action` | `() => void` | Callback to invoke. |
| `keys` | `string[]` | (Optional) Preset key bindings. |

## Method details

### defineShortcutAction

Register multiple actions at once. Throws if any `actionId` is duplicated.

```ts
engine.defineShortcutAction([
  { actionId: 'save', action: () => saveFile(), keys: ['ctrl+s'] },
  { actionId: 'quit', action: () => process.exit(0), keys: ['ctrl+q'] },
  { actionId: 'help', action: () => toggleHelp() },
]);
```

### addAction

Add a single action. Throws if the `actionId` already exists.

```ts
engine.addAction({ actionId: 'zoomIn', action: () => zoom(1.1) });
```

### hasAction

Check registration without throwing.

```ts
if (engine.hasAction('save')) {
  engine.boundKeyboard('save');
}
```

### removeAction

Remove a registered action. Throws if not registered.

```ts
engine.removeAction('save');
```

### modifyAction

Change the preset keys of an existing action. Throws if the action doesn't exist or was registered without a `keys` field.

```ts
engine.modifyAction('save', ['ctrl+shift+s']);
```

### clearShortcutOperations

Remove all registered shortcut actions.

```ts
engine.clearShortcutOperations();
```

## Effect

Actions are stored in `shortcutOperationsRef` (a `Map<string, { action, keys }>`), keyed by `actionId`. When `boundKeyboard` or `globalKeys` receives a string `operate`, it resolves it to the stored action's callback. The resolution happens at registration time (not at key-press time), so the callback reference is stable.

## Using actions with bindings

```ts
// Register once
engine.defineShortcutAction([
  { actionId: 'submit', action: handleSubmit, keys: ['ctrl+enter'] },
]);

// Reference by id everywhere
engine.boundKeyboard('submit');                           // uses preset keys
engine.boundKeyboard('f5', 'submit');                     // overrides keys locally
engine.globalKeys([{ key: 'ctrl+shift+enter', operate: 'submit' }]);
engine.stop(['submit'], { stopAction: true });            // stops action's bound keys
```

## Throws

- `[ink-cartridge]` on duplicate `actionId` in `defineShortcutAction` or `addAction`
- `[ink-cartridge]` on `modifyAction` if the action has no preset `keys`
- `[ink-cartridge]` on `removeAction` if the action is not registered

## API interactions

- **[`boundKeyboard`](./boundKeyboard.md)** — supports `boundKeyboard(actionId)` and `boundKeyboard(keys, actionId)` calling conventions
- **[`globalKeys`](./globalKeys.md)** — `operate` accepts string action IDs
- **[`stop`](./stop.md)** — `stopAction: true` resolves action IDs to their currently bound keys
- **[`addAction` / `hasAction` / `removeAction`](./shortcut-actions.md)** — single-action variants for dynamic management at runtime
- **[`sequence-actions`](./sequence-actions.md)** — the sequence equivalent; separate registry with different entry type
