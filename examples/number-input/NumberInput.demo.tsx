import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
} from '../../src/index.js';
import { NumberInput } from '../../src/components/number-input/NumberInput.js';
import { Divider } from '../../src/components/divider/Divider.js';
import { KeyHint } from '../../src/components/key-hint/KeyHint.js';

function Demo() {
  const [age, setAge] = useState(25);
  const [score, setScore] = useState(500);
  const [volume, setVolume] = useState(50);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>NumberInput component demo</Text>
      <Text dimColor>Tab to switch focus, Up/Down or Left/Right to adjust</Text>

      <Box flexDirection="column" marginTop={1} gap={1}>
        <Box>
          <Text>Age (0-150, step=1): </Text>
          <NumberInput focusId="age" value={age} onChange={setAge} min={0} max={150} />
        </Box>
        <Box>
          <Text>Score (0-999, step=10): </Text>
          <NumberInput focusId="score" value={score} onChange={setScore} min={0} max={999} step={10} />
        </Box>
        <Box>
          <Text>Volume (0-100, step=5): </Text>
          <NumberInput focusId="volume" value={volume} onChange={setVolume} min={0} max={100} step={5} />
        </Box>
      </Box>

      <Divider />

      <Box flexDirection="column">
        <Text>Current values:</Text>
        <Text>age={age}  score={score}  volume={volume}</Text>
      </Box>

      <Divider />

      <KeyHint keys={[
        { key: 'Up or Right', desc: 'Increase' },
        { key: 'Down or Left', desc: 'Decrease' },
        { key: 'Tab', desc: 'Switch focus' },
      ]} />
    </Box>
  );
}

registerComponent(Demo, {});

render(
  <ScenarioManagementProvider defaultScreen={Demo}>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
