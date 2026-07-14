# SelectInput

Vertical list selector with keyboard navigation and scrolling.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `items` | `Item<T>[]` | yes | `[]` | `{ label: string, value: T }` |
| `onSelect` | `(item: Item<T>) => void` | yes | — | Called on Enter. |
| `focusId` | `string` | yes | — | Focus target. |
| `itemComponent` | `ComponentType<I & { isSelected: boolean }>` | no | default label | Custom item renderer. Receives the item plus `isSelected`. |
| `indicatorComponent` | `ComponentType<{ isSelected: boolean }>` | no | `❯` (blue) | Left-of-item indicator. Receives `isSelected`. |
| `limit` | `number` | no | `10` | Max visible items before scrolling. |

## Keyboard (scoped to `focusId`)

| Key | Action |
|-----|--------|
| `↑` / `k` | Move up |
| `↓` / `j` | Move down |
| `Enter` | Select highlighted item |
| `1`–`9` | Jump to nth visible item |

## Best Practice

```tsx
<SelectInput
  focusId="menu"
  items={[
    { label: 'Start Game', value: 'start' },
    { label: 'Settings', value: 'settings' },
    { label: 'Quit', value: 'quit' },
  ]}
  onSelect={(item) => handleSelect(item.value)}
/>
```
