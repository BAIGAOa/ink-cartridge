# Focus System

Partition key bindings within a single screen layer so that only the active control receives events.

Without focus, a screen with two text inputs would have both responding to every key press. Focus targets solve this: each input registers its bindings under a unique `focusId`, and only the currently active target receives events. Tab/Shift+Tab cycle through targets in registration order.

## API surface

```ts
focusSet(focusId: string, group?: string): void
focusNext(group?: string): void
focusPrev(group?: string): void
focusCurrent(group?: string): { noOwner: true } | { noLayer: true } | { noFound: true } | { result: { id: string; fromGroup: string | typeof defaultTargetsSymbol } }
focusUnregister(focusId: string, group?: string): void
subscribeFocus(listener: () => void): () => void
activateFocusGroup(focusId: string, group?: string): boolean
kickFocusGroup(group?: string): boolean
```

## Method details

### focusSet

Activate a named focus target on the current owner's layer. Throws if the current owner has no layer or the target is not registered.

Targets are lazily created — the first binding with a given `focusId` (via [`boundKeyboard`](./boundKeyboard.md) `{ focusId }`) creates the target. `focusSet` must be called after at least one binding is registered.

```ts
engine.focusSet('searchInput');
```

### focusNext / focusPrev

Cycle to the next/previous focus target in registration order. Wrap around at the ends.

When `autoTab` is `true` in the engine constructor, Tab and Shift+Tab are automatically intercepted by the pipeline to call `focusNext()` / `focusPrev()`. When `autoTab` is `false` (the default), developers must bind Tab/Shift+Tab manually and call these methods themselves.

```ts
engine.focusNext();  // Tab
engine.focusPrev();  // Shift+Tab
```

### focusCurrent

Return the currently active focus target id, or `null` when no focus targets exist on the current layer.

```ts
const active = engine.focusCurrent();
// Render focus indicator for `active`
```

### focusUnregister

Remove a focus target from the current layer. If the removed target was the active one, the first remaining target (in registration order) is auto-activated. Throws if not registered.

```ts
engine.focusUnregister('searchInput');
```

### subscribeFocus

Register a listener called whenever the active focus target changes (via `focusSet`, `focusNext`, `focusPrev`, or `focusUnregister`). Returns an unsubscribe function. Use this to re-render focus indicators.

```ts
const unsub = engine.subscribeFocus(() => {
  // Re-render component to show new focus state
  render();
});
```

## Effect

Focus state is stored on each `ScreenKeyboardLayer`:
- `focusTargets: Map<string, FocusTarget>` — named targets with independent bindings
- `focusOrder: string[]` — registration order (drives Tab/Shift+Tab cycling)
- `currentFocusId: string | null` — the active target

During key matching (pipeline stage 8), the active focus target's bindings are checked first. Only if no match is found do layer-level bindings get evaluated.

## Usage

```ts
// Register bindings scoped to focus targets
engine.boundKeyboard('*', handleText, { focusId: 'nameInput' });
engine.boundKeyboard('*', handleText, { focusId: 'emailInput' });

// Activate the first field
engine.focusSet('nameInput');

// Subscribe to focus changes for UI updates
engine.subscribeFocus(() => {
  const current = engine.focusCurrent();
  updateCursor(current); // Redraw focus indicator
});

// Tab navigation via autoTab — when enabled, the pipeline handles Tab/Shift+Tab automatically.
```

## Throws

- `[ink-cartridge]` on `focusSet` if the target is not registered
- `[ink-cartridge]` on `focusUnregister` if the target is not registered

## API interactions

- **[`boundKeyboard`](./boundKeyboard.md)** — `focusId` option scopes bindings to a named focus target
- **[`penetration`](./penetration.md)** / **[`stop`](./stop.md)** — both support `focusId` scoping
- **[`allowModal`](./allowModal.md)** — supports `focusId` scoping on modal layers
- **[`useModalMissListener`](./useModalMissListener.md)** — `monitorFocusMismatch` option controls whether non-active-focus key matches count as misses
- **[`activateFocusGroup`](./activateFocusGroup.md)** — lazy initial activation for a group with no active focus; returns `false` if the group is already active
- **[`kickFocusGroup`](./kickFocusGroup.md)** — remove a group's entire active focus slot without unregistering its targets
