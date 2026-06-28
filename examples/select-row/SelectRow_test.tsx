import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  useScreenSystem,
  useKeyboard,
  KeyboardProvider,
} from '../../src/index.js';
import { SelectRow } from '../../src/components/select-row/SelectRow.js';
import { SelectInput } from '../../src/components/select/SelectInput.js';
import type { Item } from '../../src/components/select/types.js';

// Demo Data

/** Horizontal tabs for the main navigation bar */
const tabItems: Item<string>[] = [
  { label: '🏠 Home', value: 'home' },
  { label: '⚙ Settings', value: 'settings' },
  { label: '📦 Items', value: 'items' },
  { label: '🎨 Custom', value: 'custom' },
];

/** Theme options — short labels work well in a horizontal row */
const themeItems: Item<string>[] = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
  { label: 'Cyber', value: 'cyberpunk' },
  { label: 'Retro', value: 'retro' },
  { label: 'Solar', value: 'solarized' },
];

/** Difficulty levels — also short, good for horizontal layout */
const difficultyItems: Item<string>[] = [
  { label: 'Easy', value: 'easy' },
  { label: 'Normal', value: 'normal' },
  { label: 'Hard', value: 'hard' },
  { label: 'Night', value: 'nightmare' },
];

/** Longer list to trigger horizontal scrolling (limit=10) */
const colorItems: Item<string>[] = [
  { label: 'Red', value: 'red' },
  { label: 'Orange', value: 'orange' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Green', value: 'green' },
  { label: 'Cyan', value: 'cyan' },
  { label: 'Blue', value: 'blue' },
  { label: 'Purple', value: 'purple' },
  { label: 'Pink', value: 'pink' },
  { label: 'Brown', value: 'brown' },
  { label: 'Grey', value: 'grey' },
  { label: 'Gold', value: 'gold' },
  { label: 'Silver', value: 'silver' },
  { label: 'Teal', value: 'teal' },
  { label: 'Navy', value: 'navy' },
  { label: 'Lime', value: 'lime' },
];

// Custom Renderers

/** A custom indicator that shows an up-arrow below the selected item */
function ArrowIndicator({ isSelected }: { isSelected: boolean }) {
  return (
    <Box marginTop={1}>
      {isSelected ? <Text color="yellow">{'▲'}</Text> : <Text> </Text>}
    </Box>
  );
}

/** A custom item renderer that shows extra decoration when selected */
function StyledItem({
  label,
  isSelected,
}: Item<string> & { isSelected: boolean }) {
  return (
    <Text color={isSelected ? 'greenBright' : 'grey'} bold={isSelected}>
      {isSelected ? `[${label}]` : ` ${label} `}
    </Text>
  );
}

// Screen: HomeScreen
//   Shows a horizontal tab bar (SelectRow) at the top and a welcome message.
//   Demonstrates the core use case: horizontal navigation tabs.

function HomeScreen() {
  const { skip } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    boundKeyboard(['q'], () => process.exit());
  }, []);

  const handleTabSelect = (item: Item<string>) => {
    switch (item.value) {
      case 'settings':
        skip(SettingsScreen, {});
        break;
      case 'items':
        skip(ItemsScreen, {});
        break;
      case 'custom':
        skip(CustomScreen, {});
        break;
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        ╔══════════════════════════════════════════════╗
      </Text>
      <Text bold color="cyan">
        ║         SelectRow Component Demo             ║
      </Text>
      <Text bold color="cyan">
        ╚══════════════════════════════════════════════╝
      </Text>

      <Text> </Text>
      <Text dimColor>
        Use ←/→ or h/l to switch tabs  ·  Enter to confirm  ·  1-4 quick-select
      </Text>
      <Text dimColor>
        Press Q at any time to quit
      </Text>
      <Text> </Text>

      <Text bold underline>
        Navigation Tabs:
      </Text>
      <Text> </Text>

      <SelectRow<string>
        items={tabItems}
        onSelect={handleTabSelect}
        focusId="main-tabs"
      />

      <Text> </Text>
      <Text dimColor>
        ─────────────────────────────────────────────
      </Text>
      <Text> </Text>
      <Text color="grey">💡 This is a horizontal SelectRow used as a tab bar.</Text>
      <Text color="grey">💡 The ● indicator appears below the active tab.</Text>
      <Text color="grey">💡 Select a tab to navigate to that demo screen.</Text>
    </Box>
  );
}
registerComponent(HomeScreen, {});

// Screen: SettingsScreen
//   Two horizontal SelectRows stacked vertically, plus a vertical SelectInput.
//   Demonstrates mixing horizontal and vertical select components on one screen
//   with independent Tab focus cycling.

function SettingsScreen() {
  const { back } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  const [theme, setTheme] = useState<string>('dark');
  const [difficulty, setDifficulty] = useState<string>('normal');
  const [volume, setVolume] = useState<string>('medium');

  useEffect(() => {
    boundKeyboard(['b', 'escape'], () => back());
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">
        ┌─ Settings Screen ────────────────────────────┐
      </Text>
      <Text dimColor>
        │  Tab / Shift+Tab → switch focus                │
      </Text>
      <Text dimColor>
        │  ←/→ or h/l → move highlight (horizontal)      │
      </Text>
      <Text dimColor>
        │  Enter → confirm  ·  1-5 → quick-select        │
      </Text>
      <Text dimColor>
        │  B or Esc → back to Home                        │
      </Text>
      <Text> </Text>

      <Text bold>Theme</Text>
      <Text> </Text>
      <SelectRow<string>
        items={themeItems}
        onSelect={(item) => setTheme(item.value)}
        focusId="theme-row"
      />
      <Text color="green">  → {theme}</Text>

      <Text> </Text>

      <Text bold>Difficulty</Text>
      <Text> </Text>
      <SelectRow<string>
        items={difficultyItems}
        onSelect={(item) => setDifficulty(item.value)}
        focusId="difficulty-row"
      />
      <Text color="green">  → {difficulty}</Text>

      <Text> </Text>

      <Text bold>Volume (vertical SelectInput)</Text>
      <Text> </Text>
      <SelectInput<string>
        items={[
          { label: '🔇 Mute', value: 'mute' },
          { label: '🔈 Low', value: 'low' },
          { label: '🔉 Medium', value: 'medium' },
          { label: '🔊 High', value: 'high' },
        ]}
        onSelect={(item) => setVolume(item.value)}
        focusId="volume-select"
      />
      <Text color="green">  → {volume}</Text>

      <Text> </Text>
      <Text dimColor>
        └────────────────────────────────────────────────┘
      </Text>
      <Text color="grey">
        💡 Press Tab to cycle focus: Theme → Difficulty → Volume.
      </Text>
      <Text color="grey">
        💡 Horizontal rows use ←/→, vertical SelectInput uses ↑/↓.
      </Text>
    </Box>
  );
}
registerComponent(SettingsScreen, {}, { parent: HomeScreen });

// Screen: ItemsScreen
//   A horizontal SelectRow with 15 items — exceeds the default limit of 10.
//   Demonstrates automatic horizontal scrolling as the highlight moves.

function ItemsScreen() {
  const { back } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  const [color, setColor] = useState<string>('none');

  useEffect(() => {
    boundKeyboard(['b', 'escape'], () => back());
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="magenta">
        ┌─ Items Screen (Horizontal Scrolling) ────────┐
      </Text>
      <Text dimColor>
        │  {colorItems.length} items — only 10 visible at once              │
      </Text>
      <Text dimColor>
        │  Move highlight past the window to scroll      │
      </Text>
      <Text dimColor>
        │  ←/→ or h/l → move  ·  Enter → select         │
      </Text>
      <Text dimColor>
        │  B or Esc → back to Home                        │
      </Text>
      <Text> </Text>

      <Text bold underline>
        Pick a color:
      </Text>
      <Text> </Text>

      <SelectRow<string>
        items={colorItems}
        onSelect={(item) => setColor(item.value)}
        focusId="color-row"
      />

      <Text> </Text>
      <Text color="greenBright">  Selected: {color}</Text>

      <Text> </Text>
      <Text dimColor>
        └────────────────────────────────────────────────┘
      </Text>
      <Text color="grey">
        💡 Press → repeatedly to scroll past item #10.
      </Text>
      <Text color="grey">
        💡 Press 5 to quick-select the 5th visible item.
      </Text>
      <Text color="grey">
        💡 Press h/l for vim-style horizontal navigation.
      </Text>
    </Box>
  );
}
registerComponent(ItemsScreen, {}, { parent: HomeScreen });

// Screen: CustomScreen
//   Demonstrates a SelectRow with custom indicator and item renderers.
//   The custom indicator shows ▲ instead of ●; the custom item renderer
//   adds brackets around the selected item.

function CustomScreen() {
  const { back } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  const [style, setStyle] = useState<string>('none');

  useEffect(() => {
    boundKeyboard(['b', 'escape'], () => back());
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="blue">
        ┌─ Custom Renderers Demo ──────────────────────┐
      </Text>
      <Text dimColor>
        │  Custom ▲ indicator + styled item renderer     │
      </Text>
      <Text dimColor>
        │  ←/→ or h/l → move  ·  Enter → select         │
      </Text>
      <Text dimColor>
        │  B or Esc → back to Home                        │
      </Text>
      <Text> </Text>

      <Text bold underline>
        UI Style:
      </Text>
      <Text> </Text>

      <SelectRow<string>
        items={[
          { label: 'Minimal', value: 'minimal' },
          { label: 'Compact', value: 'compact' },
          { label: 'Comfortable', value: 'comfortable' },
          { label: 'Spacious', value: 'spacious' },
        ]}
        onSelect={(item) => setStyle(item.value)}
        focusId="style-row"
        indicatorComponent={ArrowIndicator}
        itemComponent={StyledItem as any}
      />

      <Text> </Text>
      <Text color="greenBright">  Style: {style}</Text>

      <Text> </Text>
      <Text dimColor>
        └────────────────────────────────────────────────┘
      </Text>
      <Text color="grey">
        💡 Custom indicator: ▲ instead of ●.
      </Text>
      <Text color="grey">
        💡 Custom item: brackets around the selected item.
      </Text>
    </Box>
  );
}
registerComponent(CustomScreen, {}, { parent: HomeScreen });

// App root

function App() {
  return (
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  );
}

// Entry point

render(
  <ScenarioManagementProvider defaultScreen={HomeScreen}>
    <App />
  </ScenarioManagementProvider>,
);
