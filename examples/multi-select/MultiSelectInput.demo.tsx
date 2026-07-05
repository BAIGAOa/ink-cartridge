import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  MultiSelectInput,
  useKeyboard,
} from '../../src/index.js';

const colorItems = [
  { label: 'Red', value: 'red' },
  { label: 'Green', value: 'green' },
  { label: 'Blue', value: 'blue' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Cyan', value: 'cyan' },
  { label: 'Magenta', value: 'magenta' },
  { label: 'White', value: 'white' },
  { label: 'Black', value: 'black' },
];

function MainScreen() {
  const { globalKeys } = useKeyboard();
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<string[] | null>(null);

  useEffect(() => {
    globalKeys([
      {
        key: 'escape',
        operate: () => process.exit(0),
      },
    ]);
  }, [globalKeys]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>MultiSelectInput Demo</Text>
      <Text dimColor>
        Space: toggle  |  Enter: submit  |  Up/Down or j/k: move  |  Esc: quit
      </Text>

      <Box marginY={1}>
        <MultiSelectInput
          focusId="colors"
          items={colorItems}
          selected={selected}
          onChange={setSelected}
          onSubmit={setSubmitted}
          limit={5}
        />
      </Box>

      <Text>
        Selected: {selected.length > 0 ? selected.join(', ') : '(none)'}
      </Text>

      {submitted && (
        <Box marginTop={1}>
          <Text color="green">
            Confirmed: {submitted.join(', ')}
          </Text>
        </Box>
      )}
    </Box>
  );
}

registerComponent(MainScreen, {});

render(
  <ScenarioManagementProvider defaultScreen={MainScreen}>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
