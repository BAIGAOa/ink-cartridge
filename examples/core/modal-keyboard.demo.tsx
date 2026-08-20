/**
 * Modal Keyboard Demo — modal pass-through and unhandled key detection.
 *
 * Demonstrates: allowModal(), useModalMissListener(), ModalMissOptions.
 *
 * Key concepts:
 *   - allowModal() lets specific keys pass through the modal barrier.
 *   - useModalMissListener() fires for keys not handled by the modal.
 *   - monitorWhen: true treats when()-rejected bindings as misses.
 *
 * Run:
 *   npx tsx examples/core/modal-keyboard.demo.tsx
 */
import React, { useState, useRef } from 'react';
import { render, Box, Text, useWindowSize } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useKeyboard,
  useModalMissListener,
  useScreenSystem,
} from '../../src/index.js';
import { Divider } from '@cartridge-engine/divider';
import { KeyHint } from '@cartridge-engine/key-hint';
import type { ModalMissEvent } from '../../src/index.js';

const MODAL_W = 46;
const MODAL_H = 15;

function center(width: number, height: number, cols: number, rows: number) {
  return {
    top: Math.max(0, Math.floor((rows - height) / 2)),
    left: Math.max(0, Math.floor((cols - width) / 2)),
  };
}

function MainScreen() {
  const [pos, setPos] = useState({ x: 5, y: 5 });
  const [lastAction, setLastAction] = useState('');
  const { boundKeyboard } = useKeyboard();
  const { openModalLayer, applyElementToModalLayer, closeModalLayer } = useScreenSystem();
  const posRef = useRef(pos);
  posRef.current = pos;

  React.useEffect(() => {
    const unbinds = [
      boundKeyboard(['up'], () => {
        setPos((p) => ({ ...p, y: Math.max(0, p.y - 1) }));
        setLastAction(`Cursor moved up to (${posRef.current.x}, ${posRef.current.y - 1})`);
      }),
      boundKeyboard(['down'], () => {
        setPos((p) => ({ ...p, y: Math.min(9, p.y + 1) }));
        setLastAction(`Cursor moved down to (${posRef.current.x}, ${posRef.current.y + 1})`);
      }),
      boundKeyboard(['left'], () => {
        setPos((p) => ({ ...p, x: Math.max(0, p.x - 1) }));
        setLastAction(`Cursor moved left to (${posRef.current.x - 1}, ${posRef.current.y})`);
      }),
      boundKeyboard(['right'], () => {
        setPos((p) => ({ ...p, x: Math.min(9, p.x + 1) }));
        setLastAction(`Cursor moved right to (${posRef.current.x + 1}, ${posRef.current.y})`);
      }),
      boundKeyboard(['i'], () => {
        setLastAction('Opening info modal...');
        openModalLayer('info-modal', 10);
        applyElementToModalLayer('info-modal', {
          elementId: 'info-modal-element',
          element: () => (
            <InfoModal onClose={() => closeModalLayer('info-modal')} />
          ),
        });
      }),
    ];
    return () => unbinds.forEach((u) => u());
  }, [applyElementToModalLayer, boundKeyboard, closeModalLayer, openModalLayer]);

  const gridRows: React.ReactNode[] = [];
  const gridHeight = 4;
  const gridWidth = 10;
  for (let y = 0; y < gridHeight; y++) {
    const cells: string[] = [];
    for (let x = 0; x < gridWidth; x++) {
      cells.push(pos.x === x && pos.y === y ? '◆' : '·');
    }
    gridRows.push(
      <Text key={y}>{cells.join(' ')}</Text>,
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Modal Keyboard Demo — Pass-Through & Miss Detection</Text>
      <Text dimColor>Arrow keys move cursor · i opens modal · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Cursor Grid (arrow keys to move):</Text>
        {gridRows}
        <Text dimColor>Cursor at ({pos.x}, {pos.y})</Text>
      </Box>

      {lastAction ? (
        <Box marginTop={1}>
          <Text color="green">{lastAction}</Text>
        </Box>
      ) : null}

      <Box marginTop={1}>
        <Text dimColor>
          When the modal is open, arrow keys still move the cursor
          (allowModal lets them pass through). Other keys trigger miss detection.
        </Text>
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: '↑↓←→', desc: 'Move cursor' },
        { key: 'i', desc: 'Open info modal' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

function InfoModal({ onClose }: { onClose: () => void }) {
  const { boundKeyboard, allowModal } = useKeyboard();
  const [missedKeys, setMissedKeys] = useState<string[]>([]);
  const [hasSaved, setHasSaved] = useState(false);
  const { columns, rows } = useWindowSize();
  const { top, left } = center(MODAL_W, MODAL_H, columns, rows);

  React.useEffect(() => {
    const unallow = allowModal(['escape', 'up', 'down', 'left', 'right']);
    return unallow;
  }, [allowModal]);

  React.useEffect(() => {
    const unbind = boundKeyboard(['s'], () => {
      setHasSaved(true);
    }, { when: () => !hasSaved });
    return unbind;
  }, [boundKeyboard, hasSaved]);

  React.useEffect(() => {
    const unbind = boundKeyboard(['escape'], onClose);
    return unbind;
  }, [boundKeyboard, onClose]);

  useModalMissListener((evt: ModalMissEvent) => {
    if (evt.miss) {
      const keyName = evt.eventNames[0] || evt.input;
      setMissedKeys((prev) => [...prev.slice(-9), keyName]);
    }
  }, { monitorWhen: true, monitorFocusMismatch: false });

  return (
    <Box
      position="absolute"
      top={top}
      left={left}
      width={MODAL_W}
      height={MODAL_H}
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
      backgroundColor="black"
    >
      <Text bold color="cyan">Info Modal</Text>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Arrow keys → pass through to cursor grid</Text>
        <Text dimColor>Escape → close modal</Text>
        <Text dimColor>s → save (works once, then when() returns false)</Text>
        <Text dimColor>Other keys → detected as misses (see below)</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Missed keys (unhandled):</Text>
        {missedKeys.length === 0 ? (
          <Text dimColor>  (press any unhandled key to see it here)</Text>
        ) : (
          missedKeys.map((k, i) => (
            <Text key={i} dimColor>  "{k}"</Text>
          ))
        )}
      </Box>

      {hasSaved && (
        <Box marginTop={1}>
          <Text color="green">✓ Saved! (s key now shows as miss due to monitorWhen)</Text>
        </Box>
      )}
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
