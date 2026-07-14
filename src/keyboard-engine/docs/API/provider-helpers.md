# Provider Helpers

Internal utility functions used by `KeyboardEngine` to manage bindings, action registries, and key-rule containers. Exported for framework adapter authors building custom binding logic or extending the engine.

All helpers are exported from `@cartridge-engine/keyboard-engine`.

## finalizeBoundKeyboard

```ts
function finalizeBoundKeyboard(
  bindingsArray: BoundKeyEntry[],
  actionKeysMap: Map<string, string[]>,
  layer: ScreenKeyboardLayer,
  entry: BoundKeyEntry,
  handler: KeyHandler | string,
  keys: string[],
  options?: BoundKeyboardOptions,
): () => void
```

Finalize a bound keyboard entry after pushing it to a bindings array. Handles:
- Registering action-key mappings (when `handler` is a string action ID)
- Wrapping the handler with `times`/`once` lifecycle
- Creating an unbind closure that cleans up the binding and global-key overrides

Returns an unbind function.

## pushKeyEntries

```ts
function pushKeyEntries(
  container: KeyRuleContainer,
  property: 'allowedKeys' | 'penetrationKeys' | 'stoppedKeys',
  keys: string[],
  createEntry: (key: string) => KeyRule,
): () => void
```

Push key entries into a rule array on a `KeyRuleContainer` (layer or focus target), deduplicating by key name. Returns a cleanup function that removes exactly the entries added by this call.

Used by `allowModal`, `penetration`, and `stop` internally.

## cleanupGlobalKeyOverrides

```ts
function cleanupGlobalKeyOverrides(
  layer: ScreenKeyboardLayer,
  keys: string[],
): void
```

Remove keys from `globalKeyOverrides` when no bindings (screen-level or focus-target) still reference them. Keeps the override set consistent after unbind operations.

## KeyRuleContainer

```ts
interface KeyRuleContainer {
  allowedKeys: KeyRule[];
  penetrationKeys: KeyRule[];
  stoppedKeys: KeyRule[];
}
```

Interface shared by `ScreenKeyboardLayer` and `FocusTarget` — any object that holds `allowedKeys`, `penetrationKeys`, and `stoppedKeys` as `KeyRule` arrays.

## setIfAbsent

```ts
function setIfAbsent<T>(
  map: Map<string, T>,
  id: string,
  value: T,
  duplicateMessage: string,
): void
```

Insert a value into the map, throwing if the ID already exists. Used by `addAction` / `addSequenceAction` to enforce uniqueness.

## deleteIfPresent

```ts
function deleteIfPresent(
  map: Map<string, unknown>,
  id: string,
  notFoundMessage: string,
): void
```

Delete an entry from the map, throwing if the ID is not registered. Used by `removeAction` / `removeSequenceAction`.

## modifyEntryKeys

```ts
function modifyEntryKeys<T extends { keys?: string[] }>(
  map: Map<string, T>,
  id: string,
  keys: string[],
  notFoundMessage: string,
  noKeysMessage: string,
): T
```

Retrieve an entry by ID, overwrite its keys, and return the entry. Throws if the entry is not found or has no preset keys. Used by `modifyAction` / `modifySequenceAction`.

## removeKeysFromActionMap

```ts
function removeKeysFromActionMap(
  map: Map<string, string[]>,
  actionId: string,
  keysToRemove: string[],
): void
```

Remove specific keys from an action's entry in the `actionKeysMap`. If no keys remain after removal, the entire entry is deleted.

## clearShortcutOperations

```ts
function clearShortcutOperations(): void
```

**Deprecated.** No-op at module level since the refactoring to per-instance state. Use `engine.clearShortcutOperations()` for instance-level cleanup. Kept for backward compatibility.
