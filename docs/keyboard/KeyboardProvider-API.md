# KeyboardProvider

Mounts the keyboard engine. Must be nested inside `ScenarioManagementProvider`.

## Signature

```tsx
function KeyboardProvider({ children }: { children: ReactNode }): JSX.Element
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `children` | `ReactNode` | App content |

No other props. All configuration happens through the hooks.

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
