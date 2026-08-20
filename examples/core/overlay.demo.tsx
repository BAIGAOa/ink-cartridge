/**
 * Layer Demo — floating layer elements with independent keyboard context.
 *
 * Demonstrates: openLayer(), applyElement(), closeLayer(),
 *               activateElement(), deactivateElement().
 *
 * Layers use position="absolute" so they float on top of the screen.
 *
 * Run:
 *   npx tsx examples/core/overlay.demo.tsx
 */
import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import { TextInput } from '@cartridge-engine/text-input';
import { Divider } from '@cartridge-engine/divider';
import { KeyHint } from '@cartridge-engine/key-hint';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useKeyboard,
  useScreenSystem,
} from '../../src/index.js';

function MainScreen() {
  const [count, setCount] = useState(50);
  const [lastAction, setLastAction] = useState('');

  const { boundKeyboard } = useKeyboard();
  const { openLayer, applyElement, closeLayer } = useScreenSystem();

  React.useEffect(() => {
    const unbindO = boundKeyboard(['o'], () => {
      setLastAction('Opened edit layer');
      openLayer('edit-counter', 10);
      applyElement('edit-counter', {
        elementId: 'edit-counter-element',
        element: () => (
          <EditOverlay
            value={count}
            onConfirm={(newVal: number) => {
              setCount(newVal);
              setLastAction(`Counter updated: ${count} → ${newVal}`);
            }}
            onClose={() => closeLayer('edit-counter')}
          />
        ),
      });
    });
    const unbindI = boundKeyboard(['i'], () => {
      setCount((c) => c + 1);
      setLastAction(`Incremented to ${count + 1}`);
    });
    return () => { unbindO(); unbindI(); };
  }, [applyElement, boundKeyboard, closeLayer, count, openLayer]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Layer Demo — Counter with Edit Layer</Text>
      <Text dimColor>Press o to edit counter via layer · Press i to increment · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>Counter value: <Text color="green" bold>{count}</Text></Text>
        {lastAction ? <Text dimColor>{lastAction}</Text> : null}
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'o', desc: 'Open edit layer' },
        { key: 'i', desc: 'Increment counter' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

function EditOverlay({
  value,
  onConfirm,
  onClose,
}: {
  value: number;
  onConfirm: (v: number) => void;
  onClose: () => void;
}) {
  const { boundKeyboard } = useKeyboard();
  const [editValue, setEditValue] = useState(
    value.toLocaleString('fullwide', { useGrouping: false }),
  );
  const [noNum, setNoNum] = useState(false);

  React.useEffect(() => {
    const unbindEsc = boundKeyboard(['escape'], onClose);
    return unbindEsc;
  }, [boundKeyboard, onClose]);

  const handleSubmit = () => {
    const parsed = Number(editValue);
    if (!isNaN(parsed)) {
      onConfirm(parsed);
      onClose();
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
