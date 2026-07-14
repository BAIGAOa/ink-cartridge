# SelectRow

Horizontal item selector. Same API as SelectInput but with left/right navigation and indicator below each item.

## Props

Same as [SelectInput](../SelectInput/SelectInput-API.md) except:
- Default `indicatorComponent` is `●` (rendered below)
- `indicatorComponent` receives `React.ComponentType<{ isSelected: boolean }>`

## Keyboard (scoped to `focusId`)

| Key | Action |
|-----|--------|
| `←` / `h` | Move left |
| `→` / `l` | Move right |
| `Enter` | Select highlighted item |
| `1`–`9` | Jump to nth visible item |

## Best Practice

```tsx
<SelectRow
  focusId="tabs"
  items={[
    { label: 'Tab A', value: 'a' },
    { label: 'Tab B', value: 'b' },
  ]}
  onSelect={(item) => setActive(item.value)}
/>
```
