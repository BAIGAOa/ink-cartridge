# allowModal

Allow specific keys to pass through the modal barrier.

By default, when a modal is active, the modal processor consumes every key event — even keys that have no binding on the modal layer. This prevents any key from reaching lower pipeline stages. `allowModal` creates an exception: keys on the allow list are released to continue through the pipeline (to global keys, overlays, and screens).

## Signature

```ts
allowModal(keys: string[], options?: AllowModalOptions): () => void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `keys` | `string[]` | Normalized key names to allow through the modal barrier. |
| `options` | `AllowModalOptions` | See below. |

### AllowModalOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `focusId` | `string` | — | Scope to a specific focus target on the modal layer. |
| `when` | `(() => boolean) \| string` | — | Only allow through when this condition evaluates to `true`. |

## Returns

A function that removes the allow entry. Calling it restores the default behavior (modal blocks the key again).

## Effect

Adds `KeyRule` entries to the modal layer's `allowedKeys` array (or the named focus target's). During pipeline stage 0 (modal processor), `allowedKeys` is checked before any other processing:

- If the key matches an allowed key and its `when` evaluates to `true`, the modal processor returns `false` — the key continues to the next pipeline stage
- If `when` returns `false`, the allow rule is ignored and the key is blocked as usual

This is the only mechanism by which keys can escape the modal barrier. Without it, every key press is consumed by the modal.

## Usage

```ts
// Allow arrow keys through the modal so the underlying screen can still navigate
engine.allowModal(['up', 'down', 'left', 'right']);

// Allow escape only when a condition is met
engine.allowModal(['escape'], {
  when: () => !isCriticalOperation,
});

// Focus-scoped allow
engine.allowModal(['enter'], { focusId: 'transferInput' });
```

## Throws

- `[ink-cartridge]` if not called on a modal layer

## API interactions

- **[`penetration`](./penetration.md)** — conceptually similar (let keys through a barrier), but operates at different pipeline stages: `penetration` at stage 8 (screen stack), `allowModal` at stage 0 (modal)
- **[`stop`](./stop.md)** — a key that passes through the modal via `allowModal` can still be stopped by a lower layer via `stop`
- **[`useModalMissListener`](./useModalMissListener.md)** — keys on the allow list that pass through are treated as "not consumed by the modal", so they count as misses if nothing else handles them
- **[`boundKeyboard`](./boundKeyboard.md)** — without `allowModal`, key bindings on the modal layer are the only way to handle keys while a modal is active
