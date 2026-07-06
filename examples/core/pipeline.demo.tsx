/**
 * Pipeline Demo — custom processor with KeyboardProvider processors prop.
 *
 * Demonstrates: Writing a custom PipelineProcessor and injecting it into the
 * keyboard pipeline via the processors prop on KeyboardProvider.
 *
 * The debug processor sits before "modal" (first in the pipeline) and logs
 * every key event without consuming it. A log panel displays the most recent
 * key events in real time.
 *
 * Run:
 *   npx tsx examples/core/pipeline.demo.tsx
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
import type { PipelineProcessor } from '../../src/keyboard/index.js';

interface LogEntry {
  id: number;
  input: string;
  time: string;
}

let nextId = 0;
const MAX_LOG = 6;
const logEntries: LogEntry[] = [];
let onLogUpdate: (() => void) | null = null;

/**
 * Custom debug processor — logs every key event without consuming it.
 *
 * Inserted before "modal" so it sees ALL key events before any other
 * processor has a chance to consume them. Returns false to pass
 * events through to the rest of the pipeline.
 */
const debugProcessor: PipelineProcessor = {
  id: 'debug-logger',
  process(ctx) {
    nextId += 1;
    logEntries.unshift({
      id: nextId,
      input: ctx.input,
      time: new Date().toLocaleTimeString(),
    });
    if (logEntries.length > MAX_LOG) logEntries.pop();
    onLogUpdate?.();
    return false;
  },
};

function useDebugLog() {
  const [, setTick] = useState(0);
  React.useEffect(() => {
    onLogUpdate = () => setTick((t) => t + 1);
    return () => { onLogUpdate = null; };
  }, []);
  return logEntries;
}

function CounterScreen() {
  const [value, setValue] = useState(0);
  const { boundKeyboard } = useKeyboard();
  const log = useDebugLog();

  React.useEffect(() => {
    const unbindA = boundKeyboard(['a'], () => setValue((v) => v + 1));
    const unbindS = boundKeyboard(['s'], () => setValue((v) => v - 1));
    return () => { unbindA(); unbindS(); };
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Pipeline Demo — Custom Processor</Text>
      <Text dimColor>a/s to change counter · q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>
          Counter: <Text color="green" bold>{value}</Text>
        </Text>
        <Text dimColor>
          Every key you press is logged by the debug processor
          inserted before "modal" in the pipeline.
        </Text>
      </Box>

      <Box
        marginTop={1}
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        padding={1}
      >
        <Text bold color="cyan">
          Debug Log (last {MAX_LOG} key events)
        </Text>
        {log.length === 0 ? (
          <Text dimColor>Press some keys to see them here...</Text>
        ) : (
          log.map((entry) => (
            <Text key={entry.id} dimColor>
              [{entry.time}] "{entry.input}"
            </Text>
          ))
        )}
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'a/s', desc: 'Increment / Decrement' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

registerComponent(CounterScreen, {});

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
  <ScenarioManagementProvider defaultScreen={CounterScreen} fullScreen>
    <KeyboardProvider
      processors={[
        { processor: debugProcessor, target: 'modal', position: 'before' },
      ]}
    >
      <App />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
