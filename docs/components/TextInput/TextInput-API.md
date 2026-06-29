# TextInput

Controlled text input with cursor, masking, and submission.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `string` | yes | — | Controlled value. |
| `onChange` | `(value: string) => void` | yes | — | Called on every change. |
| `focusId` | `string` | yes | — | Focus target. |
| `placeholder` | `string` | no | `''` | Shown when value is empty. |
| `mask` | `string` | no | — | Replace each character (e.g. `*` for passwords). |
| `showCursor` | `boolean` | no | `true` | Visual cursor + arrow key navigation. |
| `highlightPastedText` | `boolean` | no | `false` | Highlight multi-character insertions. |
| `onSubmit` | `(value: string) => void` | no | — | Called on Enter. |

## Keyboard (scoped to `focusId`)

| Key | Action |
|-----|--------|
| `←` / `→` | Move cursor (only when `showCursor`) |
| `Backspace` | Delete left of cursor |
| `Delete` | Delete right of cursor |
| `Enter` | Submit (only when `onSubmit` provided) |
| Any character | Insert at cursor |

## Best Practice

```tsx
const [name, setName] = useState('');

<TextInput
  focusId="name"
  value={name}
  onChange={setName}
  placeholder="Enter your name"
/>
```
