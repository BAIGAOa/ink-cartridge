# Focus System

Terminal UIs have no built-in notion of "which input is focused." The focus system provides programmatic focus control across interactive components on the same screen layer. When `autoTab` is enabled on `KeyboardProvider`, the engine automatically intercepts Tab/Shift+Tab to cycle focus; otherwise developers bind Tab manually.

## Single-group vs multi-group focus

Every keyboard layer starts with a **default focus group** (identified internally by `defaultTargetsSymbol`). Focus targets registered with a plain `string` `focusId` land in this default group. The default group holds **at most one** active focus target at a time — this is the classic single-focus model.

A layer may also have any number of **named focus groups**. Each named group tracks its own active focus target independently, so **multiple groups can hold focus simultaneously** on the same layer. This is the multi-focus system.

Use cases for named groups:

- A screen with an independent "row" focus and "column" focus that must both stay active at once (e.g. a grid cursor that is the intersection of two independent selections).
- Two interactive widgets that should both receive their own keys without one stealing focus from the other.

Register a focus target in a named group by passing `{ group, focusId }` instead of a bare string to any `focusId` option (`boundKeyboard`, `penetration`, `stop`, `allowModal`, `boundSequence`).

## API Overview

### useFocusState

```ts
function useFocusState(focusId: string, group?: string): boolean
```

Returns `true` when the named focus target is the active one for its group. Omit `group` to query the default group. Components use this to render their focused/unfocused visual state.

### focusSet

```ts
function focusSet(focusId: string, group?: string): void
```

Programmatically activate a focus target. When `group` is omitted the target is looked up in the default group; otherwise in the named group. Each group keeps at most one active target — activating a new one replaces the group's previous active target. Throws if the group is not registered or the focus target is not found within it.

### focusNext / focusPrev

```ts
function focusNext(group?: string): void
function focusPrev(group?: string): void
```

Cycle to the next or previous focus target **within a group** (Tab / Shift+Tab semantics). Wraps around. When `group` is omitted, cycles the default group's registration order; otherwise cycles the named group's order. Only switches the active target — it does not activate a group that currently has no active focus.

### focusCurrent

```ts
function focusCurrent(group?: string):
  | { noOwner: true }
  | { noLayer: true }
  | { noFound: true }
  | { result: { id: string; fromGroup: string | typeof defaultTargetsSymbol } }
```

Query the currently active focus target for a group. Returns a discriminated union so callers can distinguish the empty cases without guessing:

- `{ noOwner: true }` — no screen/overlay is mounted (no current owner).
- `{ noLayer: true }` — an owner exists but no keyboard layer has been created for it yet.
- `{ noFound: true }` — the group exists but has no active focus target.
- `{ result: { id, fromGroup } }` — the active focus target id and the group it belongs to.

Read `.result?.id` for the active id, or check one of the empty flags. Omit `group` to query the default group. Throws if `group` names a group that was never registered.

### focusUnregister

```ts
function focusUnregister(focusId: string, group?: string): void
```

Remove a focus target from its group. If the removed target was the active one for its group, the first remaining target (in registration order) is auto-activated; when no targets remain, that group's focus slot is cleared.

Silently no-ops when the target or group is absent on the current owner's layer — during unmount, `sync()` has already advanced the screen path to the new screen before the unmounting component's effect cleanup runs, so the focusId lives on a stale layer that `cleanLayers()` removes shortly after.

### subscribeFocus

```ts
function subscribeFocus(listener: () => void): () => void
```

Subscribe to focus change notifications. The listener fires whenever any group's active focus changes (via `focusSet`, `focusNext`, `focusPrev`, `focusUnregister` auto-activation, `activateFocusGroup`, `kickFocusGroup`, or first-target auto-selection). Returns an unsubscribe function.

### activateFocusGroup

```ts
function activateFocusGroup(focusId: string, group?: string): boolean
```

Activate a focus target in a group that currently has **no active focus**. Unlike `focusSet` — which always replaces a group's active target — this method only succeeds when the group's active slot is empty. Returns `true` on success, `false` when the group already has an active target, or when the owner/layer/group/target is absent.

Designed for lazy activation: register focus targets early, then call `activateFocusGroup` to give a group its initial focus on demand without overwriting focus that was already established.

```tsx
const { activateFocusGroup } = useKeyboard();

// Register targets across groups
boundKeyboard('*', handleName,  { focusId: { group: 'field', focusId: 'name' } });
boundKeyboard('*', handleEmail, { focusId: { group: 'field', focusId: 'email' } });
boundKeyboard('tab', handleTab, { focusId: { group: 'nav', focusId: 'tabs' } });

// The 'field' group was auto-activated when the first target registered,
// so this returns false. The 'nav' group has no active focus yet, so it succeeds.
activateFocusGroup('name', 'field');  // false — already active
activateFocusGroup('tabs', 'nav');    // true  — first activation
```

### kickFocusGroup

```ts
function kickFocusGroup(group?: string): boolean
```

Remove an entire group's active focus entry. The group holds no active focus afterward — the specific `focusId` doesn't matter, the whole group is kicked out. Returns `true` if the group was removed, `false` if the owner/layer/group is absent or the group is not currently active.

The group's registered focus targets remain intact. Call `activateFocusGroup` or `focusSet` later to re-establish focus for the group.

```tsx
const { kickFocusGroup } = useKeyboard();

// Deactivate the entire field group so no field receives keys
kickFocusGroup('field');  // true — group was active, now removed
kickFocusGroup('field');  // false — safe no-op, group is no longer active

// Re-activate later
activateFocusGroup('name', 'field');
```

## focusId option on bindings

Every binding API (`boundKeyboard`, `penetration`, `stop`, `allowModal`, `boundSequence`) accepts a `focusId` option that scopes the binding to a focus target:

```ts
// Default group — binding only fires when 'search-field' is the active default focus
boundKeyboard(['escape'], handleClear, { focusId: 'search-field' });

// Named group — binding only fires when 'r1' is the active focus in the 'row' group
boundKeyboard(['enter'], handleRowEnter, { focusId: { group: 'row', focusId: 'r1' } });
```

The first target registered in an empty group is auto-selected as that group's active focus.

## Best Practice

Separate `focusUnregister` from the keyboard binding effect:

```tsx
function TextInput({ focusId, value, onChange }) {
  const focused = useFocusState(focusId);

  // Unregister only on unmount — stable across re-renders
  const focusIdRef = useRef(focusId);
  focusIdRef.current = focusId;
  useEffect(() => {
    return () => focusUnregister(focusIdRef.current);
  }, []);

  // Keyboard bindings re-bind when value changes
  useEffect(() => {
    return boundKeyboard(['*'], handleInput, { focusId });
  }, [value]);

  return <Text>{focused ? `> ${value}_` : `  ${value}`}</Text>;
}
```

## Multi-group example

```tsx
function GridCell({ rowId, colId }) {
  // Each axis is its own focus group, so a row and a column can both be active
  const rowFocused = useFocusState(rowId, 'row');
  const colFocused = useFocusState(colId, 'col');

  useEffect(() => {
    const unRow = boundKeyboard(['left', 'right'], () => moveCol(rowId), {
      focusId: { group: 'row', focusId: rowId },
    });
    const unCol = boundKeyboard(['up', 'down'], () => moveRow(colId), {
      focusId: { group: 'col', focusId: colId },
    });
    return () => { unRow(); unCol(); };
  }, [rowId, colId]);

  return <Text>{rowFocused && colFocused ? '◆' : '◇'}</Text>;
}
```
