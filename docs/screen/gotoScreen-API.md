# gotoScreen

Jump to any registered screen, regardless of where it sits in the tree. Finds the lowest common ancestor (LCA) between the current screen and the target, then builds a path from the LCA down to the target.

## Signature

```ts
function gotoScreen<C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>
): void
```

## Behavior

- Works across branches — target doesn't need to be a direct child or sibling.
- Clears non-persistent overlays and modals. Persistent overlays and modals survive; keyboard focus is deactivated until returning to the originating screen.
- Merges `template` with `params`.

## Best Practice

Use for cross-cutting navigation like "jump to main menu" or "go to help":

```tsx
function Game() {
  const { gotoScreen } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    return boundKeyboard(['escape'], () => gotoScreen(Menu, {}));
  }, []);
}
```
