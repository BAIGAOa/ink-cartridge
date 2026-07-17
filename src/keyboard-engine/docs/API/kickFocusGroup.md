# kickFocusGroup

Remove an entire group's active focus entry from the current owner's layer — the group holds no active focus afterward.

## Signature

```ts
kickFocusGroup(group?: string): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `group` | `string \| undefined` | Focus group name. Omit to target the default group (`defaultTargetsSymbol`). |

## Returns

`true` if the group's entry was removed from `currentFocusIds`. `false` when:

- The current owner has no layer,
- The group is not registered on the layer,
- **The group is not currently active** (no entry in `currentFocusIds`).

## Effect

Splices the group's entry (by `fromGroup` match) out of the layer's `currentFocusIds` array and calls `notifyFocusChange()`. The group's registered focus targets remain intact — bindings are unaffected. The group can be re-activated later via [`activateFocusGroup`](./activateFocusGroup.md) or [`focusSet`](./focus-system.md#focusset).

Only the group's active **slot** is removed. The method does not unregister focus targets or delete the group itself; use [`focusUnregister`](./focus-system.md#focusunregister) to remove individual targets.

## Usage

```ts
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';

const engine = new KeyboardEngine({ autoTab: true });
engine.sync({ path: ['form'], activeOverlayIds: [], displayedOverlays: [],
              activeModalId: null, displayedModals: [] });

engine.boundKeyboard('*', handleInput, { focusId: { group: 'field', focusId: 'name' } });

// Later: deactivate the entire field group so no field receives keys
engine.kickFocusGroup('field');  // true — group was active, now removed

// Calling again is a safe no-op
engine.kickFocusGroup('field');  // false — group is no longer active

// React adapter
const { kickFocusGroup } = useKeyboard();
kickFocusGroup('field');
```

## API interactions

- **[`activateFocusGroup`](./activateFocusGroup.md)** — the inverse: activates a focus target in a group that has no active entry. Call `activateFocusGroup` after `kickFocusGroup` to give the group fresh focus.
- **[`focusSet`](./focus-system.md#focusset)** — also re-activates a group after a kick, but replaces any existing active target.
- **[`focusCurrent`](./focus-system.md#focuscurrent)** — after a successful kick, returns `{ noFound: true }` for that group.
- **[`focusUnregister`](./focus-system.md#focusunregister)** — removes individual focus targets from a group. `kickFocusGroup` removes only the active slot; `focusUnregister` removes the target definition itself.
- **[`subscribeFocus`](./focus-system.md#subscribefocus)** — subscribers are notified on successful removal.
