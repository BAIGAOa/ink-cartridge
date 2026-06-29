# Sequence Actions

Named, reusable multi-key sequences. The sequence counterpart of shortcut actions — define once, reference by name in `boundSequence` and `globalSequence`.

## API

### defineSequenceAction

```ts
function defineSequenceAction(entries: SequenceOperationEntry[]): void
```

Register multiple sequence actions. Each entry: `{ actionId: string, action: () => void, keys?: string[], timeout?: number }`.

### addSequenceAction

```ts
function addSequenceAction(entry: SequenceOperationEntry): void
```

Register a single sequence action. Throws on duplicate `actionId`.

### hasSequenceAction

```ts
function hasSequenceAction(sequenceActionId: string): boolean
```

Check if a sequence action exists.

### removeSequenceAction

```ts
function removeSequenceAction(sequenceActionId: string): void
```

Remove a sequence action. Throws if not found.

### modifySequenceAction

```ts
function modifySequenceAction(sequenceActionId: string, keys: string[], timeout?: number): void
```

Change a sequence action's preset keys and optionally its timeout.

### clearSequenceOperations

```ts
function clearSequenceOperations(): void
```

Remove all registered sequence actions.

## Best Practice

Same pattern as shortcut actions — define centrally, reference by name:

```tsx
defineSequenceAction([
  { actionId: 'dev-panel', keys: ['d', 'v'], action: openSettings },
]);

// Later, anywhere:
useEffect(() => {
  return boundSequence('dev-panel', {});
}, []);
```
