/**
 * Wildcard Demo — capture all normal character input via wildcard priority mode.
 *
 * Demonstrates: enableWildcardPriority(), boundKeyboard(['*'], handler).
 *
 * Key concepts:
 *   - Wildcard '*' captures all normal character keys (letters, digits, symbols).
 *   - Special keys (Enter, Escape, Tab, arrows, modifiers) are NOT captured.
 *   - Reference counting: multiple enablers keep wildcard active.
 *
 * Run:
 *   npx tsx examples/core/wildcard.demo.tsx
 */
import React, { useState } from 'react';
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
  const [captured, setCaptured] = useState('');
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [wildcardEnabled, setWildcardEnabled] = useState(false);
  const { boundKeyboard, enableWildcardPriority } = useKeyboard();

  // Toggle wildcard mode. When enabled, all normal character input is
  // captured by the wildcard * binding instead of triggering other handlers.
  React.useEffect(() => {
    if (!wildcardEnabled) return;
    const disable = enableWildcardPriority();
    return disable;
  }, [wildcardEnabled, enableWildcardPriority]);

  // Wildcard binding: captures every normal character key press.
  React.useEffect(() => {
    if (!wildcardEnabled) return;
    const unbind = boundKeyboard(['*'], (input: string) => {
      // Only capture single characters (input is the actual char for normal keys)
      if (input.length === 1) {
        setCaptured((prev) => prev + input);
      }
    });
    return unbind;
  }, [wildcardEnabled, boundKeyboard]);

  // Special keys still work normally even when wildcard is active.
  React.useEffect(() => {
    const unbindEnter = boundKeyboard(['return'], () => {
      if (wildcardEnabled && captured) {
        setSubmitted((prev) => [...prev, captured]);
        setCaptured('');
      }
    });
    const unbindEsc = boundKeyboard(['escape'], () => {
      if (wildcardEnabled) {
        setCaptured('');
      }
    });
    const unbindBack = boundKeyboard(['backspace'], () => {
      if (wildcardEnabled) {
        setCaptured((prev) => prev.slice(0, -1));
      }
    });
    const unbindT = boundKeyboard(['t'], () => {
      setWildcardEnabled((prev) => !prev);
      if (!wildcardEnabled) {
        setCaptured('');
      }
    });
    return () => { unbindEnter(); unbindEsc(); unbindBack(); unbindT(); };
  }, [boundKeyboard, wildcardEnabled, captured]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Wildcard Demo — Capture All Input</Text>
      <Text dimColor>Press t to toggle typing mode · Type anything · Enter to submit · Escape to clear · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>
          Typing mode: {wildcardEnabled
            ? <Text color="green">ON — all chars captured</Text>
            : <Text color="red">OFF</Text>}
        </Text>
      </Box>

      {wildcardEnabled && (
        <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
          <Text bold>Input buffer:</Text>
          <Text>
            {captured || <Text dimColor>(start typing...)</Text>}
            <Text color="green">█</Text>
          </Text>
          <Text dimColor>Enter → submit · Escape → clear · Backspace → delete</Text>
        </Box>
      )}

      {submitted.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Submitted:</Text>
          {submitted.map((s, i) => (
            <Text key={i} dimColor>  {i + 1}. "{s}"</Text>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          Tab still works for focus navigation even when wildcard is active.
          Normal character keys (a-z, 0-9, symbols) are all captured by *.
        </Text>
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 't', desc: 'Toggle typing mode' },
        { key: 'Enter', desc: 'Submit input' },
        { key: 'Escape', desc: 'Clear buffer' },
        { key: 'Backspace', desc: 'Delete last char' },
        { key: 'q', desc: 'Quit' },
      ]} />
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
