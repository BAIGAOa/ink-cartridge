# MultiSelectInput

Multi-select list with checkboxes and batch operations.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `items` | `Item<T>[]` | yes | `[]` | `{ label: string, value: T }` |
| `selected` | `T[]` | no | — | Controlled: selected values. |
| `defaultSelected` | `T[]` | no | `[]` | Uncontrolled initial selection. |
| `onChange` | `(selected: T[]) => void` | no | — | Called on any selection change. |
| `onSubmit` | `(selected: T[]) => void` | no | — | Called on Enter. |
| `onSelect` | `(item: Item<T>) => void` | no | — | Called when an item is toggled ON. |
| `onUnselect` | `(item: Item<T>) => void` | no | — | Called when an item is toggled OFF. |
| `onHighlight` | `(item: Item<T>) => void` | no | — | Called when the highlight cursor moves to a different item. |
| `focusId` | `string` | yes | — | Focus target. |
| `limit` | `number` | no | `10` | Max visible items. |
| `initialIndex` | `number` | no | `0` | Index of the initially highlighted item (0-based). |
| `checkboxComponent` | `ComponentType<{ isSelected: boolean }>` | no | `◉`/`○` | Custom checkbox. Receives `isSelected`. |
| `indicatorComponent` | `ComponentType<{ isHighlighted: boolean }>` | no | `❯` | Left-of-item indicator. Receives `isHighlighted`. |
| `itemComponent` | `ComponentType<I & { isHighlighted: boolean }>` | no | default label | Custom item renderer. Receives item plus `isHighlighted`. |

## Keyboard (scoped to `focusId`)

| Key | Action |
|-----|--------|
| `↑` / `k` | Move up |
| `↓` / `j` | Move down |
| `Space` | Toggle item |
| `Enter` | Submit |
| `a` | Select all |
| `q` | Deselect all |
| `1`–`9` | Toggle nth visible item |

## Best Practice

```tsx
// Uncontrolled
<MultiSelectInput
  focusId="choices"
  items={options}
  defaultSelected={['a']}
  onSubmit={(selected) => console.log(selected)}
/>

// Controlled
<MultiSelectInput
  focusId="choices"
  items={options}
  selected={selected}
  onChange={setSelected}
/>
```
