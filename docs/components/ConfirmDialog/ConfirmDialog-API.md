# ConfirmDialog

Confirmation dialog with two focusable buttons. Escape cancels from anywhere (screen-level).

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | yes | — | Dialog title. |
| `message` | `string` | yes | — | Body text. |
| `onConfirm` | `() => void` | yes | — | Called on confirm. |
| `onCancel` | `() => void` | yes | — | Called on cancel/Escape. |
| `confirmLabel` | `string` | no | `'Confirm'` | Confirm button text. |
| `cancelLabel` | `string` | no | `'Cancel'` | Cancel button text. |

## Keyboard

| Key | Scope | Action |
|-----|-------|--------|
| `Enter` | `focusId: 'dialog-confirm'` | Confirm |
| `Enter` | `focusId: 'dialog-cancel'` | Cancel |
| `Escape` | Screen-level | Cancel |

## Best Practice

Designed for the overlay system:

```tsx
openOverlay('confirm', ConfirmDialog, {
  title: 'Delete file?',
  message: 'This cannot be undone.',
  onConfirm: () => { deleteFile(); closeOverlay('confirm'); },
  onCancel: () => closeOverlay('confirm'),
});
```
