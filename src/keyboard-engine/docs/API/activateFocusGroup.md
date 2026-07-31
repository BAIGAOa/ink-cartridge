# activateFocusGroup

Activate a focus target in a group that currently has no active focus — lazy initial activation without overwriting.

## Signature

```ts
activateFocusGroup(focusId: string, group?: string): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `focusId` | `string` | The focus target id to activate. Must already be registered in the group via `boundKeyboard` (or any binding API with a `focusId` option). |
| `group` | `string \| undefined` | Focus group name. Omit to target the default group (`defaultTargetsSymbol`). |

## Returns

`true` if the target was activated (pushed into the group's active slot). `false` when:

- The current owner has no layer,
- The group is not registered on the layer,
- The `focusId` is not found within the group,
- **The group already has an active focus target** — use [`focusSet`](./focus-system.md#focusset) to switch a group's active target.

## Effect

Pushes `{ id: focusId, fromGroup: group }` into the layer's `currentFocusIds` array and calls `notifyFocusChange()`, which fires all subscribers registered via [`subscribeFocus`](./focus-system.md#subscribefocus).

Does **not** replace an existing active entry. This is the key difference from `focusSet`: `activateFocusGroup` is idempotent for already-active groups, while `focusSet` always overwrites.

## Usage

```ts
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';

const engine = new KeyboardEngine({ autoTab: true });
engine.sync({ pagePath: ['form'], layers: [],
    modalLayers: [] });

// Register focus targets across multiple groups
engine.boundKeyboard('*', handleName,  { focusId: { group: 'field', focusId: 'name' } });
engine.boundKeyboard('*', handleEmail, { focusId: { group: 'field', focusId: 'email' } });
engine.boundKeyboard('tab', handleTab, { focusId: { group: 'nav',   focusId: 'tabs' } });

// Give each group its initial focus — only succeeds for groups that are
// not yet active. The 'field' group was already auto-activated when the
// first target was registered, so this call returns false for it.
engine.activateFocusGroup('name', 'field');  // false — already active
engine.activateFocusGroup('tabs', 'nav');    // true  — first activation

// React adapter
const { activateFocusGroup } = useKeyboard();
activateFocusGroup('tabs', 'nav');
```

## API interactions

- **[`focusSet`](./focus-system.md#focusset)** — the companion method for switching a group's active target. Use `activateFocusGroup` for initial activation (safe to call when unsure if the group is already active); use `focusSet` when you know you want to replace the active target.
- **[`kickFocusGroup`](./kickFocusGroup.md)** — the inverse: removes a group's active focus entry entirely. After a kick, `activateFocusGroup` can be used to re-activate.
- **[`focusCurrent`](./focus-system.md#focuscurrent)** — call after `activateFocusGroup` to verify the group's active state.
- **[`subscribeFocus`](./focus-system.md#subscribefocus)** — subscribers are notified on successful activation.
- **[`boundKeyboard`](./boundKeyboard.md)** — focus targets must be registered via `{ focusId }` before `activateFocusGroup` can reference them.
