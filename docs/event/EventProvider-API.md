# EventProvider

Provide an EventBus instance to the React component tree via context. Clears all listeners on unmount to prevent leaks.

## Signature

```tsx
function EventProvider({ bus, children }: EventProviderProps): JSX.Element
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `bus` | `EventBus<any>` | The bus instance created by `createEventBus()`. |
| `children` | `ReactNode` | App content. |

## Best Practice

Place it inside `ScenarioManagementProvider`, wrapping `KeyboardProvider`:

```tsx
<ScenarioManagementProvider defaultScreen={Menu}>
  <EventProvider bus={bus}>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </EventProvider>
</ScenarioManagementProvider>
```

This way both `GlobalKeys` (which calls `useEmitter`) and any screen component (which calls `useSubscribe`) are inside the provider.
