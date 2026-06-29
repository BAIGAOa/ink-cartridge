# globalSequence

Register multi-key sequence bindings that fire regardless of which screen is active. Like `globalKeys`, but for key chords (minimum 2 keys per sequence).

## Signature

```ts
function globalSequence(
  entries: GlobalSequenceEntry[],
  options?: { mode?: 'replace' | 'add' }
): void
```

No return value. To remove all global sequences registered by this component, call `globalSequence([])`.

## Entry Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `keys` | `string[]` | **required** | Ordered key names (minimum 2). |
| `operate` | `() => void \| string` | **required** | Callback, or a sequence action name. |
| `category` | `ComponentType[] \| "*"` | `"*"` | Screen whitelist. |
| `affectOverlay` | `boolean` | `false` | Pipeline stage: stage 1 (`true`) or stage 4 (`false`). |
| `cover` | `boolean` | `true` | `false` = screens cannot override via `boundSequence`. |
| `timeout` | `number` | `500` | Milliseconds before a partial sequence resets. |
| `exclusive` | `boolean` | `false` | `true` = mismatched key consumed silently. |
| `executeWhenNoOverlay` | `boolean` | `false` | Fire even when no overlay is active (for `affectOverlay: true`). |
| `when` | `() => boolean` | — | Conditional. |

## Best Practice

For disambiguating sequences that share the same first key:

```tsx
useEffect(() => {
  globalSequence([
    { keys: ['g', 'g'], operate: handleGG, category: '*' },
    { keys: ['g', 'b'], operate: handleGB, category: '*' },
  ]);
}, []);
```
