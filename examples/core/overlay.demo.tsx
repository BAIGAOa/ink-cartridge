/**
 * Overlay Demo — floating dialog layers with independent keyboard context.
 *
 * Demonstrates: openOverlay(), closeOverlay(), activateOverlay(),
 *               deactivateOverlay(), boundKeyboard({ onlyThis: true }).
 *
 * Overlays use position="absolute" so they float on top of the screen.
 *
 * Run:
 *   npx tsx examples/core/overlay.demo.tsx
 */
import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useKeyboard,
  TextInput,
  openOverlay,
  closeOverlay,
  Divider,
  KeyHint,
} from '../../src/index.js';
function MainScreen() {
  const [count, setCount] = useState(50);
  const [lastAction, setLastAction] = useState('');

  const { boundKeyboard } = useKeyboard();

  React.useEffect(() => {
    const unbindO = boundKeyboard(['o'], () => {
      setLastAction('Opened edit overlay');
      openOverlay('edit-counter', EditOverlay, {
        value: count,
        onConfirm: (newVal: number) => {
          setCount(newVal);
          setLastAction(`Counter updated: ${count} → ${newVal}`);
        },
      });
    });
    const unbindI = boundKeyboard(['i'], () => {
      setCount((c) => c + 1);
      setLastAction(`Incremented to ${count + 1}`);
    });
    return () => { unbindO(); unbindI(); };
  }, [boundKeyboard, count]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Overlay Demo — Counter with Edit Overlay</Text>
      <Text dimColor>Press o to edit counter via overlay · Press i to increment · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>Counter value: <Text color="green" bold>{count}</Text></Text>
        {lastAction ? <Text dimColor>{lastAction}</Text> : null}
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'o', desc: 'Open edit overlay' },
        { key: 'i', desc: 'Increment counter' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

function EditOverlay({
  value,
  onConfirm,
}: {
  value: number;
  onConfirm: (v: number) => void;
}) {
  const { boundKeyboard } = useKeyboard();
  // toLocaleString('fullwide') avoids scientific notation for large numbers
  // (e.g. 5e+268 → "5000...") so the digit-only regex keeps working.
  const [editValue, setEditValue] = useState(
    value.toLocaleString('fullwide', { useGrouping: false }),
  );
  const [noNum, setNoNum] = useState(false);

  // Confirm on Enter — use boundKeyboard for the submit action.
  // Escape cancels and closes the overlay.
  React.useEffect(() => {
    const unbindEsc = boundKeyboard(['escape'], () => {
      closeOverlay('edit-counter');
    }, { onlyThis: true });
    return unbindEsc;
  }, [boundKeyboard]);

  const handleSubmit = () => {
    const parsed = Number(editValue);
    if (!isNaN(parsed)) {
      onConfirm(parsed);
      closeOverlay('edit-counter');
    }
  };

  return (
    <Box
      position="absolute"
      top={2}
      left={2}
      width={42}
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
      backgroundColor="black"
    >
      <Text bold>Edit Counter Value</Text>
      <Box marginTop={1}>
        <Text>Old: <Text dimColor>{value}</Text></Text>
      </Box>
      <Box marginTop={1}>
        <Text bold>New: </Text>
        <TextInput
          focusId="edit-counter-input"
          value={editValue}
          onChange={(val) => {
            // Only allow digits — non-numeric chars never appear.
            if (val === '' || /^\d+$/.test(val)) {
              setNoNum(false);
              setEditValue(val);
            } else {
              setNoNum(true);
            }
          }}
          onSubmit={handleSubmit}
          placeholder="Enter a number..."
          width={30}
          wrap
        />
      </Box>
      {noNum && (
        <Text color="red">
          Please enter a valid number.
        </Text>
      )}
      <Box marginTop={1}>
        <Text dimColor>Enter to confirm · Escape to cancel</Text>
      </Box>
    </Box>
  );
}

registerComponent(MainScreen, {});
registerComponent(EditOverlay, { value: 0, onConfirm: () => {} });

function App() {
  const { boundKeyboard } = useKeyboard();
  React.useEffect(() => {
    const unbind = boundKeyboard(['q'], () => process.exit(0));
    return unbind;
  }, [boundKeyboard]);
  return <CurrentScreen />;
}
registerComponent(App, {});

render(
  <ScenarioManagementProvider defaultScreen={MainScreen} fullScreen>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
