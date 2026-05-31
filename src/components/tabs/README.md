# Tabs

A tabbed panel component integrated with the ink-kit keyboard and focus system.

## Install

```bash
npm install @baigao_h/ink-kit
```

## Quick Start

```tsx
import React, { useState } from 'react';
import { Box, Text, render } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  Tabs,
  TextInput,
} from '@baigao_h/ink-kit';

function App() {
  const [tab, setTab] = useState('login');

  return (
    <Tabs
      focusId="main"
      tabs={[
        { id: 'login', label: 'Login',
          content: (
            <Box marginTop={1}>
              <TextInput focusId="user" value="" onChange={() => {}} />
            </Box>
          ),
        },
        { id: 'about', label: 'About',
          content: (
            <Box marginTop={1}>
              <Text>Version 1.0</Text>
            </Box>
          ),
        },
      ]}
      activeTab={tab}
      onChange={setTab}
    />
  );
}

registerComponent(App, {});

render(
  <ScenarioManagementProvider defaultScreen={App}>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| `focusId` | `string` | ✅ | — | Focus target for the tab bar. |
| `tabs` | `Tab[]` | ✅ | — | Array of tab definitions. |
| `activeTab` | `string` | ❌ | — | Controlled: currently active tab id. |
| `onChange` | `(id: string) => void` | ❌ | — | Controlled: called when active tab changes. |
| `defaultActiveTab` | `string` | ❌ | first tab | Uncontrolled: initial active tab id. |

### Tab

```ts
interface Tab {
  id: string;       // Unique identifier
  label: string;    // Display label in tab bar
  content: ReactNode; // Content rendered when active
}
```

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `←` | Switch to previous tab (wraps to last) | Tab bar focus target |
| `→` | Switch to next tab (wraps to first) | Tab bar focus target |
| `Tab` | Move focus to next focus target | KeyboardProvider (built-in) |
| `Shift+Tab` | Move focus to previous focus target | KeyboardProvider (built-in) |

## Focus System Integration

Tabs is designed to work naturally with the ink-kit focus system:

- The tab bar registers a focus target via `focusId`
- Each tab's content can contain its own focus targets (TextInputs, SelectInputs, etc.)
- Pressing **Tab** cycles through: tab bar → content's first input → content's next input → ... → tab bar
- When focused, the active tab is shown with **bold + underline + cyan** color
- Unfocused tabs appear dimmed (grey)
- `←` and `→` only work when the tab bar is focused

## Examples

### Uncontrolled (simple)

```tsx
<Tabs
  focusId="tabs"
  tabs={[
    { id: 'a', label: 'Tab A', content: <Text>Content A</Text> },
    { id: 'b', label: 'Tab B', content: <Text>Content B</Text> },
  ]}
/>
```

### Controlled (with state)

```tsx
function MyTabs() {
  const [active, setActive] = useState('a');
  return (
    <Tabs
      focusId="tabs"
      tabs={tabs}
      activeTab={active}
      onChange={setActive}
    />
  );
}
```

### With Form inside tabs

```tsx
<Tabs focusId="tabs" tabs={[
  {
    id: 'profile',
    label: 'Profile',
    content: (
      <Field name="email" rules={[required]}>
        {({ value, onChange, focusId }) => (
          <TextInput focusId={focusId} value={value} onChange={onChange} />
        )}
      </Field>
    ),
  },
]}>
```

## License

MIT
