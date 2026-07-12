# useModalMissListener

Subscribe to unhandled key presses inside a modal.

When a modal is active, the modal processor consumes every key event — but some keys may not match any binding, sequence, or navigation rule on the modal layer. `useModalMissListener` fires a callback for these "misses", letting the modal react to unknown keys (e.g. display a "key not bound" hint, play a sound, or log for debugging).

## Signature

```ts
useModalMissListener(cb: ModalMissCallback, options?: ModalMissOptions): () => void
```

## Types

```ts
type ModalMissEvent =
  | { miss: false }
  | { miss: true; key: unknown; input: string; eventNames: string[] };

type ModalMissCallback = (evt: ModalMissEvent) => void;
```

| Field | Description |
|-------|-------------|
| `miss: false` | The key was handled by the modal (bound, tab-navigated, or consumed by stop/penetration). |
| `miss: true` | The key was not handled — `key`, `input`, and `eventNames` describe the unhandled key. |

### ModalMissOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `monitorWhen` | `boolean` | `false` | When `true`, a key matching a binding whose `when()` returns `false` counts as a **miss** (default: counted as handled). |
| `monitorFocusMismatch` | `boolean` | `false` | When `true`, a key matching a binding on a non-active focus target counts as a **miss** (default: counted as handled). |

## Returns

An unsubscribe function. Call it to stop receiving miss events.

## Effect

Sets `ScreenKeyboardLayer.onMiss` and `ScreenKeyboardLayer.onMissOptions` on the current modal layer. The modal processor invokes this callback during its evaluation of each key event.

## Usage

```ts
// Basic — beep on unhandled keys
engine.useModalMissListener((evt) => {
  if (evt.miss) {
    console.log('Unhandled key in modal:', evt.input);
  }
});

// With monitoring options — catch condition-gated misses
engine.useModalMissListener(
  (evt) => {
    if (evt.miss) {
      showKeyHint(evt.eventNames);
    }
  },
  { monitorWhen: true, monitorFocusMismatch: true },
);
```

## Throws

- `[ink-cartridge]` if not called on a modal layer

## API interactions

- **[`allowModal`](./allowModal.md)** — keys on the allow list pass through the modal; when nothing in lower stages handles them, they count as misses
- **[`boundKeyboard`](./boundKeyboard.md)** — the miss detector checks whether any `boundKeyboard` binding (on the correct focus target) matched the key
- **[`focusSet`](./focus-system.md)** — when `monitorFocusMismatch` is `false` (default), a binding on the wrong focus target still counts as "handled"
