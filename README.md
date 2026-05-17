
# ink-trc

A collection of ready-to-use Ink components and tools for building terminal UI applications.

## Install

```bash
npm install ink-trc
```

## Features

### Screen Management

Register your screen components, wrap your app with `ScenarioManagementProvider`, and navigate freely from React hooks or plain `.ts` files.

```tsx
import React from 'react';
import { Box, Text, render } from 'ink';
import { registerComponent, ScenarioManagementProvider, useScreenSystem } from 'ink-trc';

function Menu({ title }: { title: string }) {
  return (
    <Box>
      <Text>{title}</Text>
    </Box>
  );
}
registerComponent(Menu, { title: '' });

function App() {
  const { currentScreen } = useScreenSystem();
  return currentScreen;
}

render(
  <ScenarioManagementProvider defaultScreen={Menu} defaultParams={{ title: 'Welcome' }}>
    <App />
  </ScenarioManagementProvider>,
);
```

- `registerComponent` — register a component as a screen, the component itself acts as the token
- `ScenarioManagementProvider` — context provider, requires `defaultScreen`, accepts optional `defaultParams`
- `useScreenSystem` — hook returning `{ currentScreen, skip }`
- `skip` — navigate to a registered screen, usable inside components or as a module-level import

Type-safe: `skip` automatically infers parameter types from your component's props.

### More Components

More Ink components coming soon.

## License

AGPL-3.0
