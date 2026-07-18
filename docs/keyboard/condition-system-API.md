# Condition System

Named runtime conditions that can be referenced by ID in any key binding's `when` option. Define a condition once, then use it across multiple bindings via string reference — no need to duplicate the evaluation function.

## API

All methods are accessed via the `useKeyboard()` hook or directly on a `KeyboardEngine` instance.

### addCondition

```ts
function addCondition(id: string, defaultVal: boolean): boolean
```

Register a named condition with an initial boolean value.

### setCondition

```ts
function setCondition(target: string, value: boolean): boolean
```

Update a registered condition's value. Returns `true` if the condition was found and updated, `false` if not registered. Throws if the condition is not found.

### removeCondition

```ts
function removeCondition(target: string): boolean
```

Remove a registered condition by ID. Returns `true` if found and removed, `false` if not registered.

## Usage in Bindings

Any key binding that accepts `when` can reference a condition by its ID string:

```tsx
// Register the condition
const { addCondition, setCondition } = useKeyboard();
addCondition('isEditing', false);

// Reference it in any binding
boundKeyboard(['s'], handleSave, { when: 'isEditing' });
globalKeys([
  { key: ['ctrl+s'], operate: handleSave, when: 'isEditing' },
]);

// Toggle the condition at runtime
setCondition('isEditing', true);
```

When `when` is a string, the engine evaluates the condition's current boolean value. The binding only fires when the condition is `true`.

## Best Practice

Use conditions to coordinate keyboard behavior across components without prop drilling:

```tsx
function Editor() {
  const { addCondition, setCondition, boundKeyboard } = useKeyboard();

  useEffect(() => {
    addCondition('readOnly', false);
  }, []);

  useEffect(() => {
    return boundKeyboard(['i'], () => setCondition('readOnly', false), { when: 'readOnly' });
  }, []);

  return <Text>Press i to edit</Text>;
}

function Viewer() {
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    return boundKeyboard(['j'], handleScroll, { when: '!readOnly' });
  }, []);
}
```

Conditions also support negation with `!` prefix (e.g. `'!readOnly'` fires when the condition is `false`).
