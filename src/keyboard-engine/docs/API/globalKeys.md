# globalKeys / getGlobalKeys

Register global key bindings that fire regardless of the screen stack.

Unlike [`boundKeyboard`](./boundKeyboard.md) which is scoped to a specific screen or overlay layer, global keys are evaluated at pipeline stages 3 and 7 — above and below the overlay layer, depending on `affectOverlay`.

Use global keys for application-wide shortcuts (quit, toggle dev tools, switch language) that should work on every screen.

## Signatures

```ts
globalKeys(entries: GlobalKeyEntry[], options?: { mode?: "replace" | "add" }): void
getGlobalKeys(): ResolvedGlobalKeyEntry[]
```

## Parameters

### globalKeys

| Param | Type | Description |
|-------|------|-------------|
| `entries` | `GlobalKeyEntry[]` | Global key definitions. |
| `options.mode` | `"replace" \| "add"` | `"replace"` (default) replaces all global keys; `"add"` appends without removing existing entries. |

### GlobalKeyEntry

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string \| string[]` | **required** | Normalized key name(s). |
| `operate` | `(() => void) \| string` | **required** | Callback or registered action ID. |
| `cover` | `boolean` | `true` | When `false`, screens cannot override this key via `boundKeyboard`. |
| `affectOverlay` | `boolean` | `false` | When `true`, fires before the overlay stage instead of after. |
| `category` | `unknown[] \| "*"` | `"*"` | Whitelist of screen components where this key is active. `"*"` = all screens. |
| `times` | `number` | — | Presses needed before firing. Must be ≥ 1. |
| `observer` | `(remaining: number) => void` | — | Called on each press toward `times`. Requires `times`. |
| `when` | `(() => boolean) \| string` | — | Condition gating. |
| `executeWhenNoOverlay` | `boolean` | `false` | When `affectOverlay: true`, still fire even with no overlay active. |
| `mode` | `string` | — | Restrict to a specific mode. |

## Returns

### globalKeys

Nothing (`void`).

### getGlobalKeys

A shallow copy of all registered `ResolvedGlobalKeyEntry` entries (with string `operate` resolved to functions).

## Effect

Writes entries into `globalKeysRef`. The `"replace"` mode clears the array first; `"add"` appends. String `operate` values are resolved to shortcut action functions at registration time via the `shortcutOperationsRef` registry.

The global key processors (stages 3 and 7) read from `globalKeysRef` on every key event. Entries are evaluated in order — the first match wins.

## Usage

```ts
engine.defineShortcutAction([{
  actionId: 'quit',
  action: () => process.exit(0),
  keys: ['ctrl+q'],
}]);

// Replace all global keys
engine.globalKeys([
  { key: 'ctrl+q', operate: 'quit' },
  { key: 'f1', operate: () => toggleHelp(), category: '*' },
  { key: 'escape', operate: handleEscape, when: () => isModalOpen, mode: 'normal' },
]);

// Add without removing existing
engine.globalKeys([
  { key: 'ctrl+shift+p', operate: openCommandPalette },
], { mode: 'add' });

// Inspect current state
const keys = engine.getGlobalKeys();
```

## Throws

- `[ink-cartridge]` if `times < 1`
- `[ink-cartridge]` if `observer` is set without `times`

## API interactions

- **[`globalSequence`](./globalSequence.md)** — global sequences fire at a higher-priority stage than global keys; use sequences for multi-key global shortcuts
- **[`boundKeyboard`](./boundKeyboard.md)** — screens can override global keys unless `cover: false`; binding a key with `cover: false` on a whitelisted screen throws
- **[`defineShortcutAction`](./shortcut-actions.md)** — string `operate` values reference registered shortcut actions
- **[`enableWildcardPriority`](./enableWildcardPriority.md)** — wildcard-priority mode affects all key matching, including global keys
- **[`Mode System`](./mode-system.md)** — global keys with `mode` set only fire in that mode
