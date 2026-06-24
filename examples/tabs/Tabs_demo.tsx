import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useKeyboard,
  Tabs,
  TextInput,
  NumberInput,
  SelectInput,
  Badge,
  Divider,
  KeyHint,
} from '../../src/index.js';

const difficultyItems = [
  { label: 'Easy', value: 'easy' },
  { label: 'Normal', value: 'normal' },
  { label: 'Hard', value: 'hard' },
];

function Demo() {
  const [tab, setTab] = useState('profile');
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [difficulty, setDifficulty] = useState('');

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Tabs Demo — Game Settings</Text>
      <Text dimColor>← → switch tabs · Tab to enter tab content</Text>

      <Box marginTop={1}>
        <Tabs
          focusId="settings"
          tabs={[
            { id: 'profile', label: 'Profile',
              content: (
                <Box flexDirection="column" marginTop={1} gap={1}>
                  <Box>
                    <Text bold>Name: </Text>
                    <TextInput
                      focusId="name-field"
                      value={name}
                      onChange={setName}
                      placeholder="Player name"
                    />
                  </Box>
                  <Box>
                    <Text bold>Age: </Text>
                    <NumberInput
                      focusId="age-field"
                      value={age}
                      onChange={setAge}
                      min={1}
                      max={99}
                    />
                  </Box>
                </Box>
              ),
            },
            { id: 'difficulty', label: 'Difficulty',
              content: (
                <Box flexDirection="column" marginTop={1}>
                  <Text bold>Select difficulty:</Text>
                  <SelectInput
                    focusId="diff-field"
                    items={difficultyItems}
                    onSelect={(item) => setDifficulty(item.value)}
                  />
                  {difficulty && (
                    <Box marginTop={1}>
                      <Badge color="yellow">{difficulty}</Badge>
                    </Box>
                  )}
                </Box>
              ),
            },
            { id: 'about', label: 'About',
              content: (
                <Box flexDirection="column" marginTop={1} gap={1}>
                  <Text>Ink-Cartridge Tabs Demo</Text>
                  <Text dimColor>Version 2.3.2</Text>
                  <Text dimColor>Built with React Ink + Focus System</Text>
                </Box>
              ),
            },
          ]}
          activeTab={tab}
          onChange={setTab}
        />
      </Box>

      <Divider />

      <Box flexDirection="column" gap={1}>
        <Text>Current values:</Text>
        <Text>Tab: {tab} | Name: "{name}" | Age: {age} | Difficulty: {difficulty || '(not set)'}</Text>
      </Box>

      <Divider />

      <KeyHint keys={[
        { key: '← →', desc: 'Switch tab' },
        { key: 'Tab', desc: 'Enter content / Next field' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

registerComponent(Demo, {});

function App() {
  const { boundKeyboard } = useKeyboard();
  React.useEffect(() => {
    boundKeyboard(['q'], () => process.exit(0));
  }, []);
  return <CurrentScreen />;
}

registerComponent(App, {});

render(
  <ScenarioManagementProvider defaultScreen={Demo}>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
