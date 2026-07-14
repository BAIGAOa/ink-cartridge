# KeyboardProvider

Mounts the keyboard engine. Must be nested inside `ScenarioManagementProvider`.

Internally creates a [KeyboardEngine](./KeyboardEngine-API.md) instance and wires the Ink `useInput` callback to `engine.processKey()`. The engine is framework-agnostic — the provider serves as the React/Ink adapter.

## Signature

```tsx
function KeyboardProvider({ children, modes, defaultMode, processors, valueSchema }: KeyboardProviderProps): JSX.Element
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `children` | `ReactNode` | App content |
| `modes` | `string[]` | (Optional) Initial mode names. See [Mode System](./mode-system-API.md). |
| `defaultMode` | `string \| null` | (Optional) Active mode on mount. Must be in `modes` or `null`. |
| `processors` | `KeyboardProcessorProps[]` | (Optional) Per-instance custom processors to inject into the pipeline |
| `valueSchema` | `ValueSchema` | (Optional) Composition value validation schema |

### `processors` prop

Each entry in `processors` describes where to insert a custom processor relative to the built-in 9-stage chain:

| Field | Type | Description |
|-------|------|-------------|
| `processor` | `PipelineProcessor` | The custom processor to insert |
| `index` | `number` | (Optional) Insert at this 0-based position |
| `target` | `BuiltinProcessorId` | (Optional) Target built-in processor ID |
| `position` | `'before' \| 'after'` | (Optional) Insert before or after `target` |

Positioning priorities (checked in order): `index` → `target` + `position` → append.

For dynamic processor management at runtime, use [`addProcessor`](./addProcessor-API.md) and [`removeProcessor`](./removeProcessor-API.md) via the `useKeyboard()` hook. Prefer the `processors` prop when the custom logic should only apply to a specific `KeyboardProvider` subtree; use runtime `addProcessor` when processors need to be added/removed based on user interaction or application state.

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

- Wires to Ink's `useInput` to receive raw key events, forwarding them to `engine.processKey()`.
- Creates the engine once via `useRef` — it persists for the component lifetime.
- On every render, calls `engine.sync()` to push screen-path and overlay/modal state into the engine.
- Runs each key event through the 9-stage pipeline (composition → modal → global sequences → global keys → composition → overlay broadcast → global sequences → global keys → screen stack).
- Cleans up layers for screens, overlays, and modals that leave the tree via post-render effects.

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
