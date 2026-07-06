/**
 * Shortcut Actions Demo — named action registration and dynamic rebinding.
 *
 * Demonstrates: defineShortcutAction, addAction, removeAction, modifyAction,
 *               boundKeyboard(actionId), boundKeyboard(keys, actionId).
 *
 * Run:
 *   npx tsx examples/core/shortcut-actions.demo.tsx
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

function MainScreen() {
  const [clipboard, setClipboard] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [selected, setSelected] = useState('Hello World');
  const { boundKeyboard, defineShortcutAction, addAction, removeAction, modifyAction, hasAction } = useKeyboard();

  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-6), msg]);

  // Define base actions once on mount.
  useEffect(() => {
    defineShortcutAction([
      { actionId: 'copy', action: () => { setClipboard(selected); addLog(`Copied: "${selected}"`); }, keys: ['c'] },
      { actionId: 'paste', action: () => { setSelected(clipboard); addLog(`Pasted: "${clipboard}"`); }, keys: ['v'] },
      { actionId: 'clear', action: () => { setSelected(''); addLog('Cleared selection'); }, keys: ['x'] },
    ]);
  }, []); // intentionally no deps — define once

  // Bind actions using their actionId strings.
  // boundKeyboard(actionId) uses the action's predefined keys and callback.
  useEffect(() => {
    const unbindCopy = boundKeyboard('copy');
    const unbindPaste = boundKeyboard('paste');
    const unbindClear = boundKeyboard('clear');
    return () => { unbindCopy(); unbindPaste(); unbindClear(); };
  }, [boundKeyboard]);

  // Dynamic action management: add a new action at runtime.
  useEffect(() => {
    const unbindA = boundKeyboard(['a'], () => {
      if (hasAction('uppercase')) {
        addLog('Action "uppercase" already exists');
        return;
      }
      addAction({ actionId: 'uppercase', action: () => {
        setSelected((prev) => prev.toUpperCase());
        addLog(`Uppercased: "${selected.toUpperCase()}"`);
      }, keys: ['u'] });
      // Now bind the new action
      const unbindNew = boundKeyboard('uppercase');
      addLog('Added action: uppercase (press u)');
      // Store cleanup if needed — for demo, we just keep it
    });
    const unbindR = boundKeyboard(['r'], () => {
      if (!hasAction('uppercase')) {
        addLog('No "uppercase" action to remove');
        return;
      }
      removeAction('uppercase');
      addLog('Removed action: uppercase');
    });
    const unbindM = boundKeyboard(['m'], () => {
      if (!hasAction('copy')) {
        addLog('No "copy" action to modify');
        return;
      }
      modifyAction('copy', ['k']);
      addLog('Modified copy action: key changed to k');
    });
    const unbindT = boundKeyboard(['t'], () => {
      if (!hasAction('copy')) {
        addLog('No "copy" action to modify');
        return;
      }
      modifyAction('copy', ['c']);
      addLog('Restored copy action: key back to c');
    });
    return () => { unbindA(); unbindR(); unbindM(); unbindT(); };
  }, [boundKeyboard, hasAction, addAction, removeAction, modifyAction, selected, addLog]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Shortcut Actions Demo — Named Action System</Text>
      <Text dimColor>c=copy · v=paste · x=clear · a=add · r=remove · m=modify · t=restore · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>Selected: <Text color="green">"{selected}"</Text></Text>
        <Text>Clipboard: <Text color="yellow">"{clipboard}"</Text></Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Event log:</Text>
        {log.length === 0 && <Text dimColor>(press c to copy, then v to paste)</Text>}
        {log.map((entry, i) => (
          <Text key={i} dimColor>  {entry}</Text>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          Try: m (rebind copy to k) → k copies → t (restore copy to c) → a (add uppercase) → u uppercases → r removes
        </Text>
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'c/v/x', desc: 'Copy / Paste / Clear' },
        { key: 'a/r', desc: 'Add / Remove action' },
        { key: 'm/t', desc: 'Modify / Restore action' },
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
