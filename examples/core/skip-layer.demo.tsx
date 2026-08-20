/**
 * Skip × Layer Demo — same-component skip (onlyAttribute) interacting with
 * crossPage and non-crossPage layers.
 *
 * Demonstrates: skip() to the current screen with { onlyAttribute }, openLayer()
 * with and without { crossPage: true }.
 *
 * Behavior shown:
 *   - 'r' refreshes the screen in place (onlyAttribute: true): internal state
 *     (counter, action line) survives, non-crossPage layers are cleared, but a
 *     crossPage layer stays open.
 *   - 'm' remounts the screen: internal state resets, non-crossPage layers are
 *     cleared, a crossPage layer still stays open.
 *
 * Run:
 *   npx tsx examples/core/skip-layer.demo.tsx
 */
import React, { useRef, useState } from 'react';
import { render, Box, Text, useWindowSize } from 'ink';
import { Divider } from '@cartridge-engine/divider';
import { KeyHint } from '@cartridge-engine/key-hint';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useKeyboard,
  useScreenSystem,
  skip,
} from '../../src/index.js';

const OVERLAY_W = 36;
const OVERLAY_H = 5;

function center(width: number, height: number, cols: number, rows: number) {
  return {
    top: Math.max(0, Math.floor((rows - height) / 2)),
    left: Math.max(0, Math.floor((cols - width) / 2)),
  };
}

function TransientLayer({ onClose }: { onClose: () => void }) {
  const { boundKeyboard } = useKeyboard();
  const { columns, rows } = useWindowSize();
  const { top, left } = center(OVERLAY_W, OVERLAY_H, columns, rows);

  React.useEffect(() => {
    const unbindEsc = boundKeyboard(['escape'], onClose);
    return unbindEsc;
  }, [boundKeyboard, onClose]);

  return (
    <Box
      position="absolute"
      top={top}
      left={left}
      width={OVERLAY_W}
      height={OVERLAY_H}
      flexDirection="column"
      borderStyle="round"
      borderColor="red"
      padding={1}
      backgroundColor="black"
    >
      <Text bold color="red">Transient Layer (non-crossPage)</Text>
      <Text dimColor>Cleared by any skip, even onlyAttribute</Text>
      <Text dimColor>Escape to close</Text>
    </Box>
  );
}

function PersistentLayer({ onClose }: { onClose: () => void }) {
  const { boundKeyboard } = useKeyboard();
  const { columns, rows } = useWindowSize();
  const { top, left } = center(OVERLAY_W, OVERLAY_H, columns, rows);

  React.useEffect(() => {
    const unbindEsc = boundKeyboard(['escape'], onClose);
    return unbindEsc;
  }, [boundKeyboard, onClose]);

  return (
    <Box
      position="absolute"
      top={top}
      left={left}
      width={OVERLAY_W}
      height={OVERLAY_H}
      flexDirection="column"
      borderStyle="round"
      borderColor="green"
      padding={1}
      backgroundColor="black"
    >
      <Text bold color="green">Persistent Layer (crossPage: true)</Text>
      <Text dimColor>Survives skip — even with onlyAttribute</Text>
      <Text dimColor>Escape to close</Text>
    </Box>
  );
}

function MainScreen({ note = 'initial' }: { note?: string }) {
  const [count, setCount] = useState(0);
  const [lastAction, setLastAction] = useState('');
  const refreshCount = useRef(0);

  const { boundKeyboard } = useKeyboard();
  const { openLayer, applyElement, closeLayer, allLayers } = useScreenSystem();

  React.useEffect(() => {
    const unbindT = boundKeyboard(['t'], () => {
      openLayer('transient', 10);
      applyElement('transient', {
        elementId: 'transient-el',
        element: () => <TransientLayer onClose={() => closeLayer('transient')} />,
      });
      setLastAction('Opened transient layer (non-crossPage)');
    });
    const unbindK = boundKeyboard(['k'], () => {
      openLayer('persistent', 20, { crossPage: true });
      applyElement('persistent', {
        elementId: 'persistent-el',
        element: () => <PersistentLayer onClose={() => closeLayer('persistent')} />,
      });
      setLastAction('Opened persistent layer (crossPage: true)');
    });
    const unbindR = boundKeyboard(['r'], () => {
      refreshCount.current += 1;
      setLastAction('r → onlyAttribute refresh, internal state kept');
      skip(
        MainScreen,
        { note: `refreshed ×${refreshCount.current}` },
        { onlyAttribute: true },
      );
    });
    const unbindM = boundKeyboard(['m'], () => {
      setLastAction('m → remount, internal state will reset');
      skip(MainScreen, { note: 'remounted' });
    });
    const unbindI = boundKeyboard(['i'], () => {
      setCount((c) => c + 1);
    });
    const unbindC = boundKeyboard(['c'], () => {
      closeLayer('transient');
      closeLayer('persistent');
      setLastAction('Closed all layers');
    });
    return () => {
      unbindT();
      unbindK();
      unbindR();
      unbindM();
      unbindI();
      unbindC();
    };
  }, [applyElement, boundKeyboard, closeLayer, openLayer]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Skip × Layer Demo</Text>
      <Text dimColor>
        note (props): <Text bold>{note}</Text> · Press t / k to open layers
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text>
          Internal counter: <Text color="green" bold>{count}</Text>
        </Text>
        <Text>
          Layers open:{' '}
          {allLayers.length === 0
            ? 'none'
            : allLayers.map((l) => `${l.layerId}${l.crossPage ? ' (crossPage)' : ''}`).join(', ')}
        </Text>
        {lastAction ? <Text color="cyan">{lastAction}</Text> : null}
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 't', desc: 'Open transient layer (non-crossPage)' },
        { key: 'k', desc: 'Open persistent layer (crossPage)' },
        { key: 'r', desc: 'Refresh self, keep state (onlyAttribute)' },
        { key: 'm', desc: 'Remount self, reset state' },
        { key: 'i', desc: 'Increment counter' },
        { key: 'c', desc: 'Close all layers' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

registerComponent(MainScreen, { note: 'initial' });

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
