# penetration

Mark keys as transparent (pass-through) on the current layer, optionally scoped to a specific focus target.

When a key is marked transparent, the layer's own bindings for that key are skipped — the key continues to the next layer below in the screen stack. Penetration means "pass through", not "block".

## Signature

```ts
penetration(keys: string[], options?: PenetrationOptions): () => void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `keys` | `string[]` | Normalized key names to make transparent. Wildcard `"*"` marks all keys. |
| `options` | `PenetrationOptions` | See below. |

### PenetrationOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `focusId` | `string` | — | Scope to a specific focus target on the current layer. |
| `when` | `(() => boolean) \| string` | — | Only transparent when this condition evaluates to `true`. |

## Returns

An "un-penetrate" function. Calling it removes the transparency markers.

## Effect

Adds `KeyRule` entries to the layer's `penetrationKeys` array (or the focus target's). During key matching (pipeline stage 8 — screen stack), penetration keys are checked first:

- If a key matches a penetration rule and the rule's `when` condition evaluates to `true`, the layer's bindings are skipped and the key falls through to the next layer below
- If `when` returns `false`, the penetration rule is ignored

## Usage

```ts
// Make arrow keys transparent so the parent screen handles them
engine.penetration(['up', 'down', 'left', 'right']);

// Focus-scoped with condition
engine.penetration(['tab'], {
  focusId: 'searchInput',
  when: () => !isEditing,
});

// Wildcard — all keys pass through
engine.penetration(['*']);
```

## API interactions

- **[`boundKeyboard`](./boundKeyboard.md)** — transparent keys skip the layer's own bindings and the next layer's `boundKeyboard` handles them
- **[`stop`](./stop.md)** — `stop` creates a propagation barrier; `penetration` is the inverse (creates a pass-through). A key that is both stopped and penetrated on the same layer: penetration is checked first, so it passes through
- **[`allowModal`](./allowModal.md)** — conceptually similar (let keys through a barrier), but `penetration` works on screen/overlay layers while `allowModal` works on modal layers
