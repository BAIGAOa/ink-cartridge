# ScenarioManagementProvider

Root provider for the screen system. Initializes navigation state and provides screen context to all descendants.

## Signature

```tsx
function ScenarioManagementProvider({
  children,
  defaultScreen,
  defaultParams?,
  fullScreen?,
}: ScenarioManagementProviderProps): JSX.Element
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | **required** | App content. |
| `defaultScreen` | `React.ComponentType` | **required** | Initial screen (must be registered). |
| `defaultParams` | `Record<string, unknown>` | template | Params merged with the component's registered template. |
| `fullScreen` | `boolean` | — | Enable full-screen mode. |

## Best Practice

Place at the very top of the app, wrapping `EventProvider` and `KeyboardProvider`:

```tsx
render(
  <ScenarioManagementProvider defaultScreen={Menu}>
    <EventProvider bus={bus}>
      <KeyboardProvider>
        <CurrentScreen />
      </KeyboardProvider>
    </EventProvider>
  </ScenarioManagementProvider>
);
```
