/**
 * CompositionEngine Demo — flag/needs key composition for compound actions.
 *
 * Demonstrates: registryCompositionKey, hasPendingComposition,
 * getCompositionContext, abortComposition.
 *
 * Key concepts:
 *   - Each key declares a flag (what it is) and needs (what must precede it).
 *   - A context object accumulates state as keys execute in sequence.
 *   - 3 → sets value=3, flag="times"
 *   - s → multiplies value × 10, flag="action"
 *   - w → fires action `value` times
 *   - Press w alone (optional head key) → fires 1 time.
 *
 * Run:
 *   npx tsx examples/core/composition.demo.tsx
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

function CompositionScreen() {
  const [log, setLog] = useState<string[]>([]);
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [lastValue, setLastValue] = useState('—');
  const {
    boundKeyboard,
    registryCompositionKey,
    hasPendingComposition,
    getCompositionContext,
    abortComposition,
  } = useKeyboard();

  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-9), msg]);

  React.useEffect(() => {
    const unbind = boundKeyboard(['q'], () => process.exit(0));
    return unbind;
  }, [boundKeyboard]);

  // Register composition keys on mount
  React.useEffect(() => {
    // "3" — writes value=3 into context
    registryCompositionKey({
      key: '3',
      flag: 'times',
      needs: [],
      execute: (ctx) => ({
        value: 3,
        lastFlag: 'times',
        steps: [...ctx.steps, '3'],
      }),
    });

    // "s" — multiplies value × 10
    registryCompositionKey({
      key: 's',
      flag: 'action',
      needs: ['times'],
      execute: (ctx) => {
        const v = (ctx.value as number) * 10;
        return { value: v, lastFlag: 'action', steps: [...ctx.steps, 's'] };
      },
    });

    // "w" — fires action `value` times (optional head key)
    registryCompositionKey({
      key: 'w',
      flag: 'action',
      needs: ['times', 'action'],
      optional: true,
      execute: (ctx) => {
        const times = (ctx.value as number) ?? 1;
        addLog(`w → performed action ${times} time${times > 1 ? 's' : ''}`);
        setLastValue(String(times));
        setPendingKeys([]);
        return { value: times, lastFlag: 'action', steps: [...ctx.steps, 'w'] };
      },
    });
  }, [registryCompositionKey]);

  // Monitor pending state
  React.useEffect(() => {
    if (hasPendingComposition()) {
      const ctx = getCompositionContext();
      setPendingKeys(ctx.steps);
      if (ctx.value !== undefined) {
        setLastValue(String(ctx.value));
      }
    }
  });

  React.useEffect(() => {
    const unbindEscape = boundKeyboard(['escape'], () => {
      if (hasPendingComposition()) {
        abortComposition();
        addLog('Chain aborted');
        setPendingKeys([]);
        setLastValue('—');
      }
    });
    const unbindR = boundKeyboard(['r'], () => {
      setLog([]);
      setPendingKeys([]);
      setLastValue('—');
    });
    return () => { unbindEscape(); unbindR(); };
  }, [boundKeyboard, hasPendingComposition, abortComposition]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>CompositionEngine Demo — Compound Key Actions</Text>
      <Text dimColor>Try: 3 w · 3 s w · w alone · Escape to abort · r to reset log</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text bold>Context value: </Text>
          <Text color="green">{lastValue}</Text>
        </Text>
        <Text>
          <Text bold>Pending chain: </Text>
          {pendingKeys.length > 0 ? (
            <Text color="yellow">{pendingKeys.join(' → ')} _</Text>
          ) : (
            <Text dimColor>none</Text>
          )}
        </Text>
        <Text>
          <Text bold>Status: </Text>
          {hasPendingComposition() ? (
            <Text color="yellow">Waiting for next key in chain...</Text>
          ) : (
            <Text dimColor>Ready for new chain</Text>
          )}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="blue" padding={1}>
        <Text bold color="blue">How to use</Text>
        <Box flexDirection="column" marginTop={1}>
          <Text>  <Text color="cyan">3</Text> → sets value=3, flag=times</Text>
          <Text>  <Text color="cyan">s</Text> → multiplies value × 10, flag=action</Text>
          <Text>  <Text color="cyan">w</Text> → fires action `value` times</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text>  <Text bold>3 w</Text>         → action performed 3×</Text>
          <Text>  <Text bold>3 s w</Text>       → action performed 30×</Text>
          <Text>  <Text bold>w</Text> alone     → action performed 1× (default)</Text>
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Event log:</Text>
        {log.length === 0 && <Text dimColor>(press keys to see results)</Text>}
        {log.map((entry, i) => (
          <Text key={i} dimColor>  [{i + 1}] {entry}</Text>
        ))}
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: '3 → s → w', desc: 'Compound key chain' },
        { key: 'w', desc: 'Default action (1 time)' },
        { key: 'Escape', desc: 'Abort chain' },
        { key: 'r', desc: 'Reset log' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

registerComponent(CompositionScreen, {});

render(
  <ScenarioManagementProvider defaultScreen={CompositionScreen} fullScreen>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
