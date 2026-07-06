/**
 * Propagation Demo — key event pass-through and blocking across screen layers.
 *
 * Demonstrates: penetration() (pass-through), stop() (propagation barrier).
 *
 * Key concepts:
 *   - penetration() makes a key transparent: the child layer skips it,
 *     allowing lower layers (parent) to handle it.
 *   - stop() blocks a key from reaching lower layers entirely.
 *   - When both penetration and stop apply to the same key, stop wins.
 *
 * Run:
 *   npx tsx examples/core/propagation.demo.tsx
 */
import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useKeyboard,
  skip,
  back,
  Divider,
  KeyHint,
} from '../../src/index.js';

function ParentScreen() {
  const [log, setLog] = useState<string[]>([]);
  const { boundKeyboard } = useKeyboard();

  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-4), msg]);

  React.useEffect(() => {
    const unbindA = boundKeyboard(['a'], () => addLog('Parent handled key "a"'));
    const unbindB = boundKeyboard(['b'], () => addLog('Parent handled key "b"'));
    const unbindEnter = boundKeyboard(['return'], () => skip(ChildScreen, {}));
    return () => { unbindA(); unbindB(); unbindEnter(); };
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Propagation Demo — Parent Screen</Text>
      <Text dimColor>Press Enter to go to Child screen · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>Parent binds: <Text color="green">a</Text>, <Text color="green">b</Text></Text>
        <Text dimColor>
          On the Child screen, key "a" is overridden and "b" penetrates through.
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Event log:</Text>
        {log.length === 0 && <Text dimColor>(press a key to see events)</Text>}
        {log.map((entry, i) => (
          <Text key={i} dimColor>  {entry}</Text>
        ))}
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'a/b', desc: 'Trigger parent handlers' },
        { key: 'Enter', desc: 'Go to Child screen' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

function ChildScreen() {
  const [log, setLog] = useState<string[]>([]);
  const { boundKeyboard, penetration, stop } = useKeyboard();
  const [stopActive, setStopActive] = useState(false);

  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-4), msg]);

  // Child overrides key 'a' — parent will NOT receive 'a' while on Child screen.
  React.useEffect(() => {
    const unbindA = boundKeyboard(['a'], () => addLog('Child handled "a" (override)'));
    return unbindA;
  }, [boundKeyboard]);

  // Make key 'b' transparent — it passes through to the parent layer.
  React.useEffect(() => {
    const unpen = penetration(['b']);
    return unpen;
  }, [penetration]);

  // Conditionally stop key 's' from propagating to parent.
  React.useEffect(() => {
    if (stopActive) {
      const unstop = stop(['s'], { when: () => stopActive });
      return unstop;
    }
    return;
  }, [stop, stopActive]);

  // Toggle stop for 's' key.
  React.useEffect(() => {
    const unbindT = boundKeyboard(['t'], () => {
      setStopActive((prev) => {
        addLog(`Stop for "s" key: ${!prev ? 'ON' : 'OFF'}`);
        return !prev;
      });
    });
    const unbindBack = boundKeyboard(['b'], () => {
      addLog('Going back to Parent');
      back();
    });
    return () => { unbindT(); unbindBack(); };
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Propagation Demo — Child Screen</Text>
      <Text dimColor>Child overrides "a" · penetrates "b" · stops "s" (toggle with t)</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text color="green">a</Text>: child override (parent blocked)
        </Text>
        <Text>
          <Text color="yellow">b</Text>: penetration (passes through to parent)
        </Text>
        <Text>
          <Text color="red">s</Text>: stop [{stopActive ? 'ON — blocked from parent' : 'OFF — reaches parent'}]
          {' '}(toggle with <Text bold>t</Text>)
        </Text>
        <Text dimColor>
          Press <Text bold>b</Text> to go back (back key, not the 'b' being tested —
          but note: 'b' penetrates so it also fires on parent!)
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Event log (child):</Text>
        {log.length === 0 && <Text dimColor>(press a, b, s, t to see events)</Text>}
        {log.map((entry, i) => (
          <Text key={i} dimColor>  {entry}</Text>
        ))}
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'a', desc: 'Child override' },
        { key: 'b', desc: 'Penetrate to parent' },
        { key: 's', desc: 'Test stop' },
        { key: 't', desc: 'Toggle stop for s' },
        { key: 'b', desc: 'Back to Parent (also penetrates!)' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

registerComponent(ParentScreen, {});
registerComponent(ChildScreen, {}, { parent: ParentScreen });

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
  <ScenarioManagementProvider defaultScreen={ParentScreen} fullScreen>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
