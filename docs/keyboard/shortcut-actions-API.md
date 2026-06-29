# Shortcut Actions

Named, reusable key bindings. Define once, reference by name in `boundKeyboard` and `globalKeys`. This decouples "what key activates this" from "what happens when activated."

## API

### defineShortcutAction

```ts
function defineShortcutAction(entries: ShortcutOperationEntry[]): void
```

Register multiple actions at once. Each entry: `{ actionId: string, action: () => void, keys?: string[] }`.

### addAction

```ts
function addAction(entry: ShortcutOperationEntry): void
```

Register a single action. Throws on duplicate `actionId`.

### hasAction

```ts
function hasAction(actionId: string): boolean
```

Check if an action exists.

### removeAction

```ts
function removeAction(actionId: string): void
```

Remove an action. Throws if not found.

### modifyAction

```ts
function modifyAction(actionId: string, keys: string[]): void
```

Change an action's preset keys.

### clearShortcutOperations

```ts
function clearShortcutOperations(): void
```

Remove all registered actions.

## Best Practice

Define actions once at the app level, then use them by name:

```tsx
function App() {
  const { defineShortcutAction } = useKeyboard();

  useEffect(() => {
    defineShortcutAction([
      { actionId: 'save', action: handleSave, keys: ['ctrl+s'] },
      { actionId: 'quit', action: handleQuit, keys: ['ctrl+q'] },
    ]);
  }, []);

  // ...
}

// Any screen can then bind by name:
function Game() {
  const { boundKeyboard } = useKeyboard();
  useEffect(() => {
    return boundKeyboard('save', {});
  }, []);
}
```
