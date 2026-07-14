# Pure Functions

Utility functions for framework adapter authors. Stateless — no engine instance required. Used inside custom `normalizeKeyNames` adapters, pipeline processors, and framework-specific keyboard handlers.

## isNormalCharacter

```ts
function isNormalCharacter(input: string, key: unknown): boolean
```

Check whether a keyboard event represents a normal (printable) character — no modifier keys, no arrows, no special keys. Drives the wildcard `"*"` binding.

See [isNormalCharacter](./isNormalCharacter.md) for full documentation.

## checkWhen

```ts
function checkWhen(
  when: (() => boolean) | string | undefined,
  conditions: Map<string, boolean>,
): boolean
```

Resolve a `when` condition. Accepts a function, a string referencing a named condition (via `addCondition`), or `undefined` (always passes). Throws if a string references an unregistered condition.

**Usage:**

```ts
import { checkWhen } from '@cartridge-engine/keyboard-engine';

const conditions = new Map([['isEditing', true]]);

checkWhen('isEditing', conditions);      // true
checkWhen(() => false, conditions);      // false
checkWhen(undefined, conditions);        // true (no condition = pass)
```

## checkGlobalKey

```ts
function checkGlobalKey(
  entry: GlobalKeyEntry,
  eventNames: string[],
  topComponent: unknown | null,
  layersRef: MutableRef<Map<unknown | string, ScreenKeyboardLayer>>,
): boolean
```

Check whether a global key entry should fire for the current event. Evaluates key-name matching, category whitelist, and screen-level global-key override (cover mechanism).

**Usage (inside a custom processor):**

```ts
import { checkGlobalKey } from '@cartridge-engine/keyboard-engine';

for (const entry of resolvedGlobalKeys) {
  if (checkGlobalKey(entry, eventNames, ctx.topComponent, ctx.layersRef)) {
    entry.operate();
    return true;
  }
}
```

## keyMatchesRule

```ts
function keyMatchesRule(
  keyName: string,
  rules: KeyRule[],
  conditions: Map<string, boolean>,
): boolean
```

Check whether a normalized key name is covered by a list of key rules (penetration, stop, or allow rules). Returns `true` when any rule's key matches AND its `when` condition evaluates to `true`.

## tryMatchBindings

```ts
function tryMatchBindings(
  bindings: BoundKeyEntry[],
  currentMode: string | null,
  availableKeys: string[],
  input: string,
  key: unknown,
  conditions: Map<string, boolean>,
  skipBinding?: (binding: BoundKeyEntry) => boolean,
): boolean
```

Iterate through a list of bindings and fire the first matching handler. Matches exact key names first, then falls back to the wildcard `"*"` binding for normal character input. Each binding is checked against mode, when, and skipBinding constraints before firing.

**Usage (inside a custom processor):**

```ts
import { tryMatchBindings } from '@cartridge-engine/keyboard-engine';

if (tryMatchBindings(layer.bindings, currentMode, eventNames, input, key, conditions)) {
  return true; // event consumed
}
```

## handleTabNavigation

```ts
function handleTabNavigation(
  layer: ScreenKeyboardLayer,
  eventNames: string[],
  shift: boolean,
  notifyFocusChange: () => void,
): boolean
```

Built-in Tab / Shift+Tab focus cycling. Moves `layer.currentFocusId` forward (Tab) or backward (Shift+Tab) through the layer's `focusOrder` list, wrapping at both ends. Returns `true` if focus was moved.

## handleLayer

```ts
function handleLayer(
  layer: ScreenKeyboardLayer,
  eventNames: string[],
  input: string,
  key: unknown,
  isTop: boolean,
  notifyFocusChange: () => void,
  activeOverlayCount: number,
  isOverlay: boolean,
  wildcardFirst: boolean,
  currentMode: string | null,
  conditions: Map<string, boolean>,
  notifyPendingSyncs?: () => void,
): boolean
```

Full keyboard event handling for a single layer. Evaluates in order: tab navigation, penetration keys, wildcard priority, sequence matching, focus-target bindings, layer-level bindings, and stopped keys. Returns `true` if the event was consumed.

This is the core routing function. Framework adapters that want to reuse the built-in layer dispatch logic should call `handleLayer` rather than re-implementing the evaluation order.
