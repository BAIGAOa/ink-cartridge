# stop

Prevent keys from propagating beyond the current layer.

A "stop barrier" means: once a key reaches this layer, even if no binding handles it, it does not fall through to layers below. Use this when a screen or overlay wants to own certain keys exclusively.

## Signature

```ts
stop(keys: string[], options?: StopOptions): () => void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `keys` | `string[]` | Normalized key names to stop. Wildcard `"*"` stops all keys. |
| `options` | `StopOptions` | See below. |

### StopOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `focusId` | `string` | — | Scope to a specific focus target. |
| `stopAction` | `boolean` | `false` | Treat entries in `keys` as shortcut action IDs — resolves to the actual bound keys. |
| `when` | `(() => boolean) \| string` | — | Only stop when this condition evaluates to `true`. When `false`, the key propagates normally. |

## Returns

A function that removes the stop barrier.

## Effect

Adds `KeyRule` entries to the layer's `stoppedKeys` array (or the focus target's). During key matching, stopped keys are checked after bindings and penetrations:

- If a key matches a stop rule (and its `when` evaluates to `true`), the key is consumed — no lower layer receives it
- If `when` returns `false`, the stop rule is ignored and the key propagates

`stopAction: true` adds a layer of indirection: the stop rule is stored against the action ID, and at key-match time the engine resolves the action's current bound keys. If the action is later rebound to different keys, the stop barrier automatically follows.

## Usage

```ts
// Stop arrow keys — parent screens never see them
engine.stop(['up', 'down', 'left', 'right']);

// Stop via action ID resolution
engine.stop(['submit', 'cancel'], { stopAction: true });

// Focus-scoped with condition
engine.stop(['escape'], {
  focusId: 'modal',
  when: () => hasUnsavedChanges,
});
```

## Throws

- `[ink-cartridge]` if `stopAction: true` and an action ID has no bound keys

## API interactions

- **[`penetration`](./penetration.md)** — inverse of `stop`. If a key is both stopped and penetrated on the same layer, penetration takes priority and the key passes through
- **[`boundKeyboard`](./boundKeyboard.md)** — stopped keys are consumed even if no binding matches them, preventing lower layers from seeing them
- **[`allowModal`](./allowModal.md)** — `stop` blocks propagation within the screen stack; `allowModal` controls the modal barrier (a different pipeline stage)
- **[`defineShortcutAction`](./shortcut-actions.md)** — `stopAction: true` resolves action IDs to keys via `actionKeysMap`
