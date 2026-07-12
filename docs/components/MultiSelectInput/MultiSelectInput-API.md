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
| `focusId` | `string` | yes | — | Focus target. |
| `limit` | `number` | no | `10` | Max visible items. |
| `checkboxComponent` | `ComponentType` | no | `◉`/`○` | Custom checkbox. |

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
