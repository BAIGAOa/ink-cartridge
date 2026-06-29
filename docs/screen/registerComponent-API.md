# registerComponent

Register a React component as a screen in the navigation tree. Associates it with default props and optionally a parent, building the tree that `skip`, `back`, and `gotoScreen` walk.

## Signature

```ts
function registerComponent<C extends React.ComponentType<any>>(
  component: C,
  template: React.ComponentProps<C>,
  options?: RegisterOptions
): void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `component` | `React.ComponentType` | The component — also used as the unique key in the registry. |
| `template` | `React.ComponentProps<C>` | Default props merged with params at navigation time. |
| `options.parent` | `React.ComponentType` | Parent screen. If omitted, the component is a root candidate. |

## Throws

- If the component is already registered.
- If `parent` is specified but not yet registered.

## Best Practice

Register all screens at module level, before rendering:

```tsx
registerComponent(Menu, {});
registerComponent(Game, { level: 1 }, { parent: Menu });
registerComponent(Settings, {}, { parent: Menu });
```

Root candidates (`parent` omitted) can be used as the `defaultScreen` for `ScenarioManagementProvider`.
