# SelectRow

A horizontal single-select list component deeply integrated with the `ink-cartridge` keyboard and focus system. Symmetric to [SelectInput](../select/README.md) but items are laid out horizontally, navigated with left/right arrows, and the indicator is rendered below each item.

## Install

```bash
npm install @baigao_h/ink-cartridge
```

## Quick Start

```tsx
import React from 'react';
import { Box, render } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  useKeyboard,
  KeyboardProvider,
  SelectRow,
} from '@baigao_h/ink-cartridge';

function App() {
  const { boundKeyboard } = useKeyboard();

  React.useEffect(() => {
    boundKeyboard(['q'], () => process.exit(0));
  }, []);

  return <CurrentScreen />;
}

function Menu() {
  return (
    <Box flexDirection="column" padding={1}>
      <SelectRow
        focusId="tabs"
        items={[
          { label: 'General', value: 'general' },
          { label: 'Audio', value: 'audio' },
          { label: 'Video', value: 'video' },
        ]}
        onSelect={(item) => console.log('select:', item.value)}
      />
    </Box>
  );
}

registerComponent(Menu, {});

render(
  <ScenarioManagementProvider defaultScreen={Menu}>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
```

## Props

### `focusId: string` (required)

The focus target identifier for this SelectRow instance. It is registered on the current screen's keyboard layer. When multiple interactive components exist on the same screen, users cycle between them with `Tab` / `Shift+Tab`. Only the currently active focus target receives key events.

```tsx
<SelectRow focusId="tabs" items={tabs} onSelect={handleSelect} />
<SelectRow focusId="pages" items={pages} onSelect={handleSelect} />
```

### `items: Item<T>[]` (required)

The list of selectable items. Each item must have a `label` (display text) and a `value`. An optional `Key` can be supplied for React list rendering.

```ts
interface Item<T = unknown> {
  label: string;
  value: T;
  Key?: string;
}
```

```tsx
const items = [
  { label: 'General', value: 'general' },
  { label: 'Audio', value: 'audio', Key: 'audio-tab' },
];
```

### `onSelect: (item: Item<T>) => void` (required)

Called when the user presses `Enter` or a number key (`1`–`9`) on a visible item.

### `itemComponent?: React.ComponentType<I & { isSelected: boolean }>`

Custom renderer for each item. Receives the item's fields plus `isSelected` (boolean, whether the highlight cursor is on this item).

```tsx
<SelectRow
  focusId="tabs"
  items={tabs}
  onSelect={switchTab}
  itemComponent={({ label, isSelected }) => (
    <Text color={isSelected ? 'green' : 'white'}>{label}</Text>
  )}
/>
```

### `indicatorComponent?: React.ComponentType<{ isSelected: boolean }>`

Custom indicator rendered below each item. Default: a blue `●` character when selected, otherwise a blank space.

```tsx
<SelectRow
  focusId="tabs"
  items={tabs}
  onSelect={handleSelect}
  indicatorComponent={({ isSelected }) => (
    <Text color="yellow">{isSelected ? '▲' : ' '}</Text>
  )}
/>
```

## Keyboard Bindings

| Key | Action |
|-----|--------|
| `←` / `h` | Move highlight left |
| `→` / `l` | Move highlight right |
| `Enter` | Confirm selection |
| `1 – 9` | Directly select the visible item at that position |
| `Tab` | Move focus to the next interactive component (handled by the keyboard system) |
| `Shift+Tab` | Move focus to the previous interactive component (handled by the keyboard system) |

All key bindings are automatically registered on the focus target identified by `focusId`. When the component unmounts, all bindings are removed and the focus target is unregistered.

## Focus Integration

SelectRow is designed to work with `ink-cartridge`'s keyboard and focus system — no extra setup required.

- Each instance registers a **focus target** on the current screen's keyboard layer via its `focusId`.
- When the component is **unfocused**, its items are visually dimmed and **no key events are delivered** — arrow keys and Enter are ignored.
- When the component is **focused**, it receives arrow keys, Enter, and number keys.
- Pressing `Tab` cycles focus to the next `focusId` registered on the same screen; `Shift+Tab` cycles backward.
- On unmount, the focus target is automatically unregistered. If it was the active focus target, focus falls back to the first remaining target on the layer.

**Multiple interactive components on the same screen work without conflict:**

```tsx
function Settings() {
  return (
    <Box flexDirection="column">
      <SelectRow
        focusId="tabs"
        items={[
          { label: 'General', value: 'general' },
          { label: 'Audio', value: 'audio' },
        ]}
        onSelect={switchTab}
      />
      <SelectInput
        focusId="volume"
        items={[
          { label: 'Low', value: 'low' },
          { label: 'High', value: 'high' },
        ]}
        onSelect={setVolume}
      />
    </Box>
  );
}
```

Press `Tab` to switch between the tab bar and the volume list. Arrow keys only affect the currently focused component.

## Virtual Scrolling

When `items.length > 10`, only 10 items are rendered at a time. Scrolling is handled automatically as the highlight moves — items outside the visible window are unmounted. Number keys `1`–`9` always map to the currently visible items.

## Type Parameters

```ts
SelectRow<T, I extends Item<T>>(props: SelectRowProps<T, I>)
```

- `T` — the type of `item.value`.
- `I` — the extended item type (must include `label`, `value`, and optionally `Key`). Defaults to `Item<T>`.

```tsx
interface Tab extends Item<string> {
  icon: string;
}

const tabs: Tab[] = [
  { label: 'General', value: 'general', icon: '⚙' },
  { label: 'Audio', value: 'audio', icon: '🔊' },
];

<SelectRow<string, Tab>
  focusId="tabs"
  items={tabs}
  onSelect={handleSelect}
  itemComponent={({ label, icon, isSelected }) => (
    <Text color={isSelected ? 'blue' : 'white'}>
      {icon} {label}
    </Text>
  )}
/>;
```

## Lifecycle

1. **Mount**: SelectRow registers `focusId` on the current screen's keyboard layer. If this is the first focus target on the layer, it becomes the active target immediately.
2. **Active**: When the focus target is active, arrow keys and Enter are dispatched to this instance.
3. **Inactive**: When another focus target becomes active, this instance stops receiving key events. Items remain rendered but appear dimmed.
4. **Unmount**: All key bindings are removed, and the focus target is unregistered. Focus moves to the next available target on the layer.

## Differences from SelectInput

| | SelectInput | SelectRow |
|---|---|---|
| Layout | Vertical (`column`) | Horizontal (`row`) |
| Navigation keys | `↑`/`↓` + `j`/`k` | `←`/`→` + `h`/`l` |
| Indicator position | Left of item | Below item |
| Default indicator | `❯` | `●` |
| Storage key prefix | `select:` | `select-row:` |

## License

MIT
