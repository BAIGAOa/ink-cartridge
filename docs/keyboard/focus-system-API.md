# Focus System

Terminal UIs have no built-in notion of "which input is focused." The focus system provides Tab-based navigation and programmatic focus control across interactive components on the same screen layer.

## API Overview

### useFocusState

```ts
function useFocusState(focusId: string): boolean
```

Returns `true` when the named focus target is active. Components use this to render their focused/unfocused visual state.

### focusSet

```ts
function focusSet(focusId: string): void
```

Programmatically activate a focus target. Throws if not found on the current layer.

### focusNext / focusPrev

```ts
function focusNext(): void
function focusPrev(): void
```

Cycle to the next or previous focus target (Tab / Shift+Tab semantics). Wraps around.

### focusCurrent

```ts
function focusCurrent(): string | null
```

Return the currently active focus target ID, or `null`.

### focusUnregister

```ts
function focusUnregister(focusId: string): void
```

Remove a focus target. If it was the active one, the next target is auto-activated.

### subscribeFocus

```ts
function subscribeFocus(listener: () => void): () => void
```

Subscribe to focus change notifications. Returns an unsubscribe function.

## Best Practice

Separate `focusUnregister` from the keyboard binding effect:

```tsx
function TextInput({ focusId, value, onChange }) {
  const focused = useFocusState(focusId);

  // Unregister only on unmount — stable across re-renders
  const focusIdRef = useRef(focusId);
  focusIdRef.current = focusId;
  useEffect(() => {
    return () => focusUnregister(focusIdRef.current);
  }, []);

  // Keyboard bindings re-bind when value changes
  useEffect(() => {
    return boundKeyboard(['*'], handleInput, { focusId });
  }, [value]);

  return <Text>{focused ? `> ${value}_` : `  ${value}`}</Text>;
}
```
