# globalKeys

Register key bindings that fire regardless of which screen is active — subject to `category` whitelisting and pipeline positioning.

## Signature

```ts
function globalKeys(
  entries: GlobalKeyEntry[],
  options?: { mode?: 'replace' | 'add' }
): void
```

No return value. To remove all global keys registered by this component, call `globalKeys([])`.

## Entry Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string \| string[]` | **required** | Key name(s). Same format as `boundKeyboard` (`"ctrl+s"`, `"f1"`, etc.). |
| `operate` | `() => void \| string` | **required** | Callback, or a shortcut action name. |
| `category` | `ComponentType[] \| "*"` | `"*"` | `"*"` = all screens. `[]` = disabled. `[Menu]` = only when top of stack is Menu. |
| `affectOverlay` | `boolean` | `false` | `true` = fires before overlays (pipeline stage 2). `false` = after overlays (stage 5). |
| `cover` | `boolean` | `true` | `false` = screens cannot override this key with `boundKeyboard`. |
| `times` | `number` | — | Fire on every Nth press. Counter is per-entry, never auto-resets. |
| `executeWhenNoOverlay` | `boolean` | `false` | For `affectOverlay: true` entries: also fire when no overlay is open. |
| `when` | `(() => boolean) \| string` | — | Conditional. Accepts a function or a registered condition ID. |
| `mode` | `string` | — | Restrict to a specific mode. See [Mode System](./mode-system-API.md). |

## Best Practice

Use a null-component mounted once, delegating all logic to the event bus:

```tsx
function GlobalKeys() {
  const emitSave = useEmitter('SAVE');
  const emitQuit = useEmitter('QUIT');
  const { globalKeys } = useKeyboard();

  useEffect(() => {
    globalKeys([
      { key: ['ctrl+s'], operate: emitSave, category: '*' },
      { key: ['ctrl+q'], operate: emitQuit, category: '*', times: 2 },
    ]);
  }, []);

  return null;
}
```

Any screen then subscribes:

```tsx
function Editor() {
  useSubscribe('SAVE', handleSave);
  // ...
}
```

This keeps key registration and business logic completely decoupled.

## ResolvedGlobalKeyEntry

When a global key binding is resolved (keys normalized, action looked up, options merged), the engine produces a `ResolvedGlobalKeyEntry` — the fully resolved form of `GlobalKeyEntry`. It is exported as a type from `ink-cartridge` for use in type annotations and processor logic.
