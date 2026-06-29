# Advanced Patterns

## GlobalKeys + Event Bus (Recommended)

The cleanest way to wire global keys to business logic is a null-component that never unmounts, delegating all work to the event bus:

```tsx
// 1. Define events
interface AppEvents {
  SAVE: void;
  QUIT: void;
}
const bus = createEventBus<AppEvents>();

// 2. GlobalKeys — emits only, zero business logic
function GlobalKeys() {
  const emitSave = useEmitter('SAVE');
  const emitQuit = useEmitter('QUIT');
  const { globalKeys } = useKeyboard();

  useEffect(() => {
    globalKeys([
      { key: ['ctrl+s'], operate: emitSave, category: '*' },
      { key: ['ctrl+q'], operate: emitQuit, category: '*', times: 2 },
    ]);
  }, []);

  return null;
}

// 3. Any screen — subscribes
function Editor() {
  useSubscribe('SAVE', handleSave);
  // ...
}
```

Mount `GlobalKeys` once, anywhere in the tree where it's above `CurrentScreen`. It renders nothing but keeps the global key registrations alive for the app's entire lifetime.

## Custom Input Component

Building a component that captures character input while respecting the focus system:

```tsx
function CustomInput({ focusId, value, onChange }) {
  const focused = useFocusState(focusId);
  const { boundKeyboard, enableWildcardPriority } = useKeyboard();
  const valueRef = useRef(value);
  valueRef.current = value;

  // Separate unmount cleanup from binding re-registration
  const focusIdRef = useRef(focusId);
  focusIdRef.current = focusId;
  useEffect(() => {
    return () => focusUnregister(focusIdRef.current);
  }, []);

  useEffect(() => {
    const disablePriority = enableWildcardPriority();
    const unbind = boundKeyboard(['*'], (input) => {
      onChange(valueRef.current + input);
    }, { focusId });
    return () => { disablePriority(); unbind(); };
  }, [value]);

  return <Text>{focused ? `> ${value}_` : `  ${value}`}</Text>;
}
```

## Exposing Global Scoped Bindings Context

When you register global keys across multiple components and want to avoid conflicts, use `mode: 'add'` + a shared registration order convention:

```tsx
// GlobalKeys mounts first — registers base keys
globalKeys([...], { mode: 'replace' });

// AppKeyboard mounts later — adds app-specific keys
globalKeys([...], { mode: 'add' });
```

## Modal Override via cover

Prevent screens from overriding a critical global key:

```tsx
globalKeys([
  { key: ['ctrl+c'], operate: handleInterrupt, category: '*', cover: false },
]);
// Now no screen can call boundKeyboard(['ctrl+c'], ...) without throwing.
```
