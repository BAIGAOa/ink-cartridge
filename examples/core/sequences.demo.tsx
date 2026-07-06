/**
 * Sequences Demo — multi-key sequences (Vim-style combos).
 *
 * Demonstrates: boundSequence(), globalSequence(), exclusive mode, timeouts.
 *
 * Key concepts:
 *   - boundSequence registers a multi-key combo on the current screen layer.
 *   - Non-exclusive: mismatched key cancels sequence and falls through.
 *   - Exclusive: mismatched key is silently consumed, sequence stays pending.
 *   - globalSequence works across all screens (like globalKeys for combos).
 *
 * Run:
 *   npx tsx examples/core/sequences.demo.tsx
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

const LINES = [
  'Line 1: The quick brown fox',
  'Line 2: jumps over the lazy dog',
  'Line 3: Pack my box with five',
  'Line 4: dozen liquor jugs',
  'Line 5: How vexingly quick daft',
  'Line 6: zebras jump',
];

function ViewerScreen() {
  const [cursorLine, setCursorLine] = useState(2);
  const [lines, setLines] = useState([...LINES]);
  const [log, setLog] = useState<string[]>([]);
  const [pendingHint, setPendingHint] = useState('');
  const { boundKeyboard, boundSequence } = useKeyboard();

  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-4), msg]);

  // Normal single-key bindings
  React.useEffect(() => {
    const unbindJ = boundKeyboard(['j'], () => {
      setCursorLine((prev) => Math.min(lines.length - 1, prev + 1));
      setPendingHint('');
    });
    const unbindK = boundKeyboard(['k'], () => {
      setCursorLine((prev) => Math.max(0, prev - 1));
      setPendingHint('');
    });
    return () => { unbindJ(); unbindK(); };
  }, [boundKeyboard, lines.length]);

  // Sequence: g g → jump to top
  React.useEffect(() => {
    const unbind = boundSequence(['g', 'g'], () => {
      setCursorLine(0);
      addLog('gg → Jumped to top!');
      setPendingHint('');
    });
    return unbind;
  }, [boundSequence]);

  // Sequence: d d → delete current line (exclusive mode)
  React.useEffect(() => {
    const unbind = boundSequence(['d', 'd'], () => {
      setLines((prev) => {
        if (prev.length <= 1) {
          addLog('Cannot delete last line');
          return prev;
        }
        const item = prev[cursorLine];
        const updated = prev.filter((_, i) => i !== cursorLine);
        if (cursorLine >= updated.length) {
          setCursorLine(Math.max(0, updated.length - 1));
        }
        addLog(`dd → Deleted: ${item}`);
        return updated;
      });
      setPendingHint('');
    }, {
      exclusive: true, // wrong keys consumed silently during sequence
      timeout: 800,    // longer timeout for this sequence
    });
    return unbind;
  }, [boundSequence, cursorLine]);

  // Monitor for pending sequence (visual feedback when 'g' or 'd' is first pressed)
  React.useEffect(() => {
    const unbindG = boundKeyboard(['g'], () => {
      setPendingHint('g _ (waiting for second key...)');
    });
    const unbindD = boundKeyboard(['d'], () => {
      setPendingHint('d _ (waiting for second key... exclusive mode)');
    });
    return () => { unbindG(); unbindD(); };
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Sequences Demo — Vim-Style Text Viewer</Text>
      <Text dimColor>j/k to move · gg to jump top · dd to delete line · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        {lines.map((line, i) => {
          const isCursor = i === cursorLine;
          return (
            <Text key={i} backgroundColor={isCursor ? 'blue' : undefined}>
              {isCursor ? '▶' : ' '} {line}
            </Text>
          );
        })}
      </Box>

      {pendingHint ? (
        <Box marginTop={1}>
          <Text color="yellow">{pendingHint}</Text>
        </Box>
      ) : null}

      <Box marginTop={1} flexDirection="column">
        <Text bold>Event log:</Text>
        {log.length === 0 && <Text dimColor>(try: j, k, gg, dd)</Text>}
        {log.map((entry, i) => (
          <Text key={i} dimColor>  {entry}</Text>
        ))}
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'j/k', desc: 'Move cursor' },
        { key: 'g g', desc: 'Jump to top (sequence)' },
        { key: 'd d', desc: 'Delete line (exclusive sequence)' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

registerComponent(ViewerScreen, {});

function App() {
  const { boundKeyboard, globalSequence } = useKeyboard();
  const [globalSeqLog, setGlobalSeqLog] = useState('');

  // Global sequence: Ctrl+Q Q → quit (demonstrates cross-screen combos)
  React.useEffect(() => {
    globalSequence([
      {
        keys: ['q', 'q'],
        operate: () => {
          setGlobalSeqLog('Global sequence Q Q triggered! (not quitting to keep demo running)');
        },
        timeout: 800,
        category: '*',
      },
    ], { mode: 'replace' });
    return () => globalSequence([], { mode: 'replace' });
  }, [globalSequence]);

  React.useEffect(() => {
    const unbind = boundKeyboard(['q'], () => process.exit(0));
    return unbind;
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column">
      <CurrentScreen />
      {globalSeqLog ? (
        <Box padding={1}><Text color="cyan">{globalSeqLog}</Text></Box>
      ) : null}
    </Box>
  );
}
registerComponent(App, {});

render(
  <ScenarioManagementProvider defaultScreen={ViewerScreen} fullScreen>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
