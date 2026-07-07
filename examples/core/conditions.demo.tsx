/**
 * Conditions Demo — named runtime conditions for keyboard bindings.
 *
 * Demonstrates: addCondition(), setCondition(), removeCondition(),
 * and when: string on boundKeyboard, boundSequence, globalKeys.
 *
 * Key concepts:
 *   - addCondition('isEditing', false) registers a named boolean flag.
 *   - setCondition('isEditing', true) toggles it at runtime.
 *   - when: 'isEditing' on any binding makes it reactive to the flag.
 *   - One setCondition call affects ALL bindings sharing that id.
 *
 * Run:
 *   npx tsx examples/core/conditions.demo.tsx
 */
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useKeyboard,
  Divider,
  KeyHint,
} from '../../src/index.js';

function EditorScreen() {
  const [mode, setMode] = useState('viewing');
  const [saved, setSaved] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const { boundKeyboard, addCondition, setCondition } = useKeyboard();

  // Register the named condition and bind mode-dependent keys.
  useEffect(() => {
    addCondition('isEditing', false);

    const unbinds = [
      // Toggle editing mode
      boundKeyboard(['e'], () => {
        const nowEditing = mode !== 'editing';
        setCondition('isEditing', nowEditing);
        setMode(nowEditing ? 'editing' : 'viewing');
        if (!nowEditing) setSaved(false);
      }, { when: () => mode !== 'editing' }),

      // Exit editing mode or quit depending on current mode.
      // Uses a function when() to close over React state, and a named
      // condition when: 'isEditing' for the save/undo bindings below —
      // demonstrating that both styles coexist in the same component.
      boundKeyboard(['escape'], () => {
        if (mode === 'editing') {
          setCondition('isEditing', false);
          setMode('viewing');
          setSaved(false);
        } else {
          process.exit(0);
        }
      }),

      // Save — only works in editing mode via named condition
      boundKeyboard(['ctrl+s', 's'], () => {
        setSaved(true);
      }, { when: 'isEditing' }),

      // Undo — only works in editing mode via named condition
      boundKeyboard(['ctrl+z', 'u'], () => {
        setUndoCount((c) => c + 1);
      }, { when: 'isEditing' }),
    ];
    return () => unbinds.forEach((u) => u());
  }, [boundKeyboard, addCondition, setCondition, mode]);

  const modeColor = mode === 'editing' ? 'green' : 'yellow';

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Conditions Demo — Named Condition System</Text>

      <Box marginTop={1}>
        <Text>Mode: </Text>
        <Text color={modeColor} bold>{mode.toUpperCase()}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          The &apos;isEditing&apos; condition controls save (s/ctrl+s) and undo (u/ctrl+z).
          One addCondition() call + when: &apos;isEditing&apos; on multiple bindings.
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text>Actions log:</Text>
        {saved && <Text color="green">  ✓ Saved!</Text>}
        {undoCount > 0 && (
          <Text color="cyan">  ↩ Undo × {undoCount}</Text>
        )}
        {!saved && undoCount === 0 && (
          <Text dimColor>  (no actions yet)</Text>
        )}
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'e', desc: 'Enter editing mode' },
        { key: 's / ctrl+s', desc: `Save${mode !== 'editing' ? ' (disabled — not editing)' : ''}` },
        { key: 'u / ctrl+z', desc: `Undo${mode !== 'editing' ? ' (disabled — not editing)' : ''}` },
        { key: 'escape', desc: 'Exit editing mode / quit' },
      ]} />
    </Box>
  );
}

registerComponent(EditorScreen, {});

function App() {
  const { globalKeys, addCondition } = useKeyboard();

  useEffect(() => {
    addCondition('appReady', true);
    globalKeys([{
      key: 'q',
      operate: () => process.exit(0),
      when: 'appReady',
      category: '*',
      affectOverlay: false,
    }], { mode: 'replace' });
    return () => globalKeys([], { mode: 'replace' });
  }, [globalKeys, addCondition]);

  return <CurrentScreen />;
}
App.displayName = 'App';

render(
  <ScenarioManagementProvider defaultScreen={EditorScreen} fullScreen>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
