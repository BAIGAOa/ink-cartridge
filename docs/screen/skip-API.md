# skip

Navigate to a **direct child** of the current screen. Merges the registered template with the passed params.

## Signature

```ts
// Hook version
function skip<C extends React.ComponentType<any>>(
  component: C,
  params: React.ComponentProps<C>,
  options?: SkipOptions
): void

// Module-level version (same signature)
import { skip } from 'ink-cartridge';
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onlyAttribute` | `boolean` | `false` | When `true` and the target is already the current screen, only updates params without remounting. |

## Behavior

- Validates `component` is a direct child of the current screen. Throws otherwise.
- Clears all overlays and modals.
- Merges `template` (from `registerComponent`) with `params`.

## Best Practice

```tsx
function Menu() {
  const { skip } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    return boundKeyboard(['s'], () => skip(Settings, {}));
  }, []);

  return <Text>Press s for Settings</Text>;
}
```
