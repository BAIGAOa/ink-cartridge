# useKeyboard

The entry point to all keyboard operations. Returns the full `KeyboardContextValue` — every binding, focus, and action method lives here.

## Signature

```ts
function useKeyboard(): KeyboardContextValue
```

## Returns

An object with all keyboard methods for the current layer (screen, overlay, or modal — detected automatically from the component's position in the tree).

## Best Practice

Destructure only what you need. Call it once per component.

```tsx
function Menu() {
  const { boundKeyboard, stop, boundSequence } = useKeyboard();

  useEffect(() => {
    const unbind = boundKeyboard(['s'], handleStart);
    const unstop = stop(['q']);
    return () => { unbind(); unstop(); };
  }, []);

  return <Text>Menu</Text>;
}
```

All methods returned by `useKeyboard` are documented separately — see the [API index](./README.md#api-index).
