/**
 * Focus Management Demo — Tab-based focus cycling with named focus targets.
 *
 * Demonstrates: focusId, useFocusState(), focusSet(), focusNext(), focusPrev(),
 *               boundKeyboard({ focusId }), focusUnregister().
 *
 * Run:
 *   npx tsx examples/core/focus-management.demo.tsx
 */
import React, { useState, useEffect, useRef } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useKeyboard,
  useFocusState,
  Divider,
  KeyHint,
} from '../../src/index.js';

/** A single focusable item in the list. */
function FocusableItem({
  id,
  label,
  onAction,
  color,
}: {
  id: string;
  label: string;
  onAction: () => void;
  color?: string;
}) {
  const isFocused = useFocusState(id);
  const { boundKeyboard, focusUnregister } = useKeyboard();

  // Register this item as a named focus target so Tab/Shift+Tab can reach it.
  // The handler is a no-op for navigation keys; the actual action is in onAction.
  useEffect(() => {
    const unbind = boundKeyboard(['return'], onAction, { focusId: id });
    return unbind;
  }, [boundKeyboard, id, onAction]);

  // Clean up the focus target when this component unmounts.
  useEffect(() => {
    return () => focusUnregister(id);
  }, [id, focusUnregister]);

  const bgColor = isFocused ? (color ?? 'cyan') : undefined;
  const indicator = isFocused ? '▶' : ' ';

  return (
    <Box>
      <Text backgroundColor={bgColor}>
        {indicator} {label}
        {isFocused ? ' (focused)' : ''}
      </Text>
    </Box>
  );
}

function MainScreen() {
  const [items, setItems] = useState([
    { id: 'item-1', label: 'Apple', color: 'red' },
    { id: 'item-2', label: 'Banana', color: 'yellow' },
    { id: 'item-3', label: 'Cherry', color: 'magenta' },
    { id: 'item-4', label: 'Dragonfruit', color: 'green' },
  ]);
  const [log, setLog] = useState<string[]>([]);
  const { boundKeyboard, focusSet, focusCurrent } = useKeyboard();

  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-5), msg]);

  const handleItemAction = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item) addLog(`Selected: ${item.label}`);
  };

  const handleDeleteFocused = () => {
    const current = focusCurrent();
    if (!current) {
      addLog('No item focused to delete');
      return;
    }
    // Don't delete the last item
    if (items.length <= 1) {
      addLog('Cannot delete last item');
      return;
    }
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== current);
      if (filtered.length === prev.length) {
        addLog(`Item ${current} not found`);
        return prev;
      }
      addLog(`Deleted: ${current}`);
      return filtered;
    });
  };

  useEffect(() => {
    const unbindD = boundKeyboard(['d'], handleDeleteFocused);
    const unbind1 = boundKeyboard(['1'], () => {
      if (items.length >= 1) focusSet(items[0].id);
    });
    const unbind2 = boundKeyboard(['2'], () => {
      if (items.length >= 2) focusSet(items[1].id);
    });
    const unbind3 = boundKeyboard(['3'], () => {
      if (items.length >= 3) focusSet(items[2].id);
    });
    const unbind4 = boundKeyboard(['4'], () => {
      if (items.length >= 4) focusSet(items[3].id);
    });
    return () => { unbindD(); unbind1(); unbind2(); unbind3(); unbind4(); };
  }, [boundKeyboard, focusSet, items, handleDeleteFocused]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Focus Management Demo — Tab-Cycling List</Text>
      <Text dimColor>Tab/Shift+Tab to cycle focus · Enter to select · d to delete focused · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Items:</Text>
        {items.map((item) => (
          <FocusableItem
            key={item.id}
            id={item.id}
            label={item.label}
            color={item.color}
            onAction={() => handleItemAction(item.id)}
          />
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          Current focus: {focusCurrent() ?? 'none'}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Event log:</Text>
        {log.length === 0 && <Text dimColor>(Tab to items, press Enter or d)</Text>}
        {log.map((entry, i) => (
          <Text key={i} dimColor>  {entry}</Text>
        ))}
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'Tab', desc: 'Next focus' },
        { key: 'Shift+Tab', desc: 'Previous focus' },
        { key: 'Enter', desc: 'Select focused item' },
        { key: 'd', desc: 'Delete focused item' },
        { key: '1-4', desc: 'Jump focus directly' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

registerComponent(MainScreen, {});

function App() {
  const { boundKeyboard } = useKeyboard();
  useEffect(() => {
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
