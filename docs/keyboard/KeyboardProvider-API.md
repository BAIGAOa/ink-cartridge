# KeyboardProvider

Mounts the keyboard engine. Must be nested inside `ScenarioManagementProvider`.

## Signature

```tsx
function KeyboardProvider({ children, modes, defaultMode, processors }: KeyboardProviderProps): JSX.Element
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `children` | `ReactNode` | App content |
| `modes` | `string[]` | (Optional) Initial mode names. See [Mode System](./mode-system-API.md). |
| `defaultMode` | `string \| null` | (Optional) Active mode on mount. Must be in `modes` or `null`. |
| `processors` | `KeyboardProcessorProps[]` | (Optional) Per-instance custom processors to inject into the pipeline |

### `processors` prop

Each entry in `processors` describes where to insert a custom processor relative to the built-in 7-stage chain:

| Field | Type | Description |
|-------|------|-------------|
| `processor` | `PipelineProcessor` | The custom processor to insert |
| `index` | `number` | (Optional) Insert at this 0-based position |
| `target` | `BuiltinProcessorId` | (Optional) Target built-in processor ID |
| `position` | `'before' \| 'after'` | (Optional) Insert before or after `target` |

Positioning priorities (checked in order): `index` → `target` + `position` → append.

This is the per-instance counterpart to [`addProcessor`](./addProcessor-API.md). Prefer `processors` when the custom logic should only apply to a specific `KeyboardProvider` subtree; use `addProcessor` when it should apply globally.

```tsx
<KeyboardProvider
  processors={[
    { processor: auditLogger, index: 0 },
    { processor: specialKeyHandler, target: 'modal', position: 'after' },
  ]}
>
  <CurrentScreen />
</KeyboardProvider>
```

## Returns

A React element that provides keyboard context to all descendants.

## Behavior

- Connects to Ink's `useInput` to receive raw key events.
- Creates a `useRef`-based layer store that persists across the provider's lifetime.
- Runs each key event through the 7-stage pipeline (modal → global sequences → global keys → overlay broadcast → screen stack).
- Cleans up layers for screens, overlays, and modals that leave the tree.

## Best Practice

Place it as close to the leaves as possible — right above `<GlobalKeys />` and `<CurrentScreen />`. The `EventProvider` should wrap it when using the event bus:

```tsx
render(
  <ScenarioManagementProvider defaultScreen={Menu}>
    <EventProvider bus={bus}>
      <KeyboardProvider>
        <GlobalKeys />
        <CurrentScreen />
      </KeyboardProvider>
    </EventProvider>
  </ScenarioManagementProvider>
);
```
