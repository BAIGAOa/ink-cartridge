# boundKeyboard

Bind one or more keys to a handler on the current owner's layer.

Keys can trigger either an inline callback or a registered shortcut action (by its `actionId`). Each call creates an unbind function — call it when the owner unmounts or the binding should be removed.

Supports three calling conventions:
1. `boundKeyboard(keys, handler, options?)` — explicit keys and callback
2. `boundKeyboard(keys, actionId, options?)` — explicit keys, action by id
3. `boundKeyboard(actionId, options?)` — uses the action's preset keys

## Signature

```ts
boundKeyboard(keys: string | string[], handler: KeyHandler, options?: BoundKeyboardOptions): () => void
boundKeyboard(keys: string | string[], actionId: string, options?: BoundKeyboardOptions): () => void
boundKeyboard(actionId: string, options?: BoundKeyboardOptions): () => void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `keys` | `string \| string[]` | Normalized key name(s) to match (e.g. `"return"`, `"ctrl+s"`, `["y", "n"]`). |
| `handler` | `KeyHandler` | Callback invoked on key match: `(input: string, key: unknown) => void`. |
| `actionId` | `string` | Reference a registered shortcut action by its `actionId`. |
| `options` | `BoundKeyboardOptions` | See below. |

### BoundKeyboardOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `focusId` | `string` | — | Scope bindings to a named focus target. |
| `onlyThis` | `boolean` | `false` | Only active when the owning overlay/screen is the stack top. |
| `once` | `boolean` | `false` | Auto-remove after first invocation. Unbind happens before handler runs. |
| `times` | `number` | — | Presses needed before firing. Counter resets after handler runs. |
| `observer` | `(remaining: number) => void` | — | Called on each press while counting toward `times`. Requires `times`. |
| `when` | `(() => boolean) \| string` | — | Condition function or registered condition id. Binding skipped when `false`. |
| `mode` | `string` | — | Restrict to a specific mode; skipped when active mode doesn't match. |

## Returns

An unbind function. Calling it removes the binding from the layer immediately. Safe to call multiple times.

## Effect

Adds a `BoundKeyEntry` to the current owner's keyboard layer:

- With `focusId` → stored on the named `FocusTarget.bindings` array
- Without `focusId` → stored on the layer-level `bindings` array

If a `mode` is specified, the binding is tagged with it. When the active mode doesn't match, the binding is skipped during key matching (as if it doesn't exist).

The binding is evaluated at pipeline stage 8 (screen stack), after global keys and overlay broadcast. Within a layer, focus-target bindings are checked before layer-level bindings.

## Usage

```ts
// Inline handler
const unbind = engine.boundKeyboard('return', (input, key) => {
  console.log('submit');
});

// Via shortcut action
engine.boundKeyboard('ctrl+s', 'save');

// Via action preset keys
engine.boundKeyboard('confirm');

// With options — one-shot, focus-scoped, press-counted
engine.boundKeyboard('escape', handleCancel, {
  once: true,
  focusId: 'dialog',
  times: 2,
  when: () => isDirty,
  mode: 'normal',
});
```

## API interactions

- **[`focusSet`](./focus-system.md)** — focus-scoped bindings only receive events when their focus target is active
- **[`penetration`](./penetration.md)** — keys marked as transparent skip the binding layer entirely
- **[`stop`](./stop.md)** — stopped keys don't propagate beyond this layer
- **[`defineShortcutAction`](./shortcut-actions.md)** — shortcut actions referenced by `actionId` must be registered before use
- **[`pushOwner`](./pushOwner.md)** — determines which layer the binding is stored on (current owner)
- **[`Mode System`](./mode-system.md)** — bindings tagged with `mode` are only active in that mode
- **[`Condition System`](./condition-system.md)** — bindings with `when: "conditionId"` are gated by condition state
