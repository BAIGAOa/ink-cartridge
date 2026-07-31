/**
 * Modal Layer Demo — blocking dialog with absolute keyboard priority.
 *
 * Demonstrates: openModalLayer(), applyElementToModalLayer(),
 *               closeModalLayer(), closeAllModalLayer(), crossPage,
 *               modal-layer zIndex stacking.
 *
 * Modal layers use position="absolute" so they float on top of the screen.
 *
 * Run:
 *   npx tsx examples/core/modal.demo.tsx
 */
import React, { useState } from 'react';
import { render, Box, Text, useWindowSize } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useKeyboard,
  useScreenSystem,
  skip,
  back,
  Divider,
  KeyHint,
} from '../../src/index.js';

const MODAL_W = 40;
const CONFIRM_H = 8;
const INFO_H = 8;

function center(width: number, height: number, cols: number, rows: number) {
  return {
    top: Math.max(0, Math.floor((rows - height) / 2)),
    left: Math.max(0, Math.floor((cols - width) / 2)),
  };
}

function MainScreen() {
  const [lastAction, setLastAction] = useState('');
  const { boundKeyboard } = useKeyboard();
  const {
    openModalLayer,
    applyElementToModalLayer,
    closeModalLayer,
    closeAllModalLayer,
  } = useScreenSystem();

  React.useEffect(() => {
    const unbindD = boundKeyboard(['d'], () => {
      setLastAction('Opened delete confirmation modal layer');
      openModalLayer('confirm-delete', 2);
      applyElementToModalLayer('confirm-delete', {
        elementId: 'confirm-delete-element',
        element: () => (
          <ConfirmDeleteModal
            itemName="readme.txt"
            onConfirm={() => {
              setLastAction('Deleted: readme.txt');
              closeModalLayer('confirm-delete');
            }}
            onCancel={() => {
              setLastAction('Delete cancelled');
              closeModalLayer('confirm-delete');
            }}
          />
        ),
      });
    });
    const unbindI = boundKeyboard(['i'], () => {
      setLastAction('Opened info modal layer (lower zIndex)');
      openModalLayer('file-info', 1);
      applyElementToModalLayer('file-info', {
        elementId: 'file-info-element',
        element: () => (
          <FileInfoModal
            fileName="readme.txt"
            fileSize="12.4 KB"
            onClose={() => closeModalLayer('file-info')}
          />
        ),
      });
    });
    const unbindX = boundKeyboard(['x'], () => {
      closeAllModalLayer();
      setLastAction('All modal layers closed');
    });
    const unbindS = boundKeyboard(['s'], () => {
      setLastAction('Skipping to Sub screen (non-crossPage modal layers auto-close)');
      skip(SubScreen, {});
    });
    const unbindJ = boundKeyboard(['j'], () => {
      setLastAction('j pressed — this only works with no modal layer active');
    });
    return () => { unbindD(); unbindI(); unbindX(); unbindS(); unbindJ(); };
  }, [
    applyElementToModalLayer,
    boundKeyboard,
    closeAllModalLayer,
    closeModalLayer,
    openModalLayer,
  ]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Modal Layer Demo — File Manager</Text>
      <Text dimColor>Press d to delete · i for info · x to close all modal layers · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>Files:</Text>
        <Text>  📄 readme.txt (12.4 KB)</Text>
        <Text>  📄 config.json (2.1 KB)</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Last action:</Text>
        {lastAction ? <Text color="green">{lastAction}</Text> : <Text dimColor>(press a key)</Text>}
        <Text dimColor>
          When a modal layer is active, the j key is blocked — try pressing j with a modal open!
        </Text>
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'd', desc: 'Delete file (modal layer)' },
        { key: 'i', desc: 'File info (modal layer)' },
        { key: 'x', desc: 'Close all modal layers' },
        { key: 's', desc: 'Skip to Sub screen' },
        { key: 'j', desc: 'Screen key (blocked when modal open)' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

function SubScreen() {
  const { boundKeyboard } = useKeyboard();

  React.useEffect(() => {
    const unbindB = boundKeyboard(['b'], () => back());
    return unbindB;
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Modal Layer Demo — Sub Screen</Text>
      <Text dimColor>Non-crossPage modal layers are auto-closed when navigating here.</Text>
      <Box marginTop={1}>
        <Text>Press b to go back.</Text>
      </Box>
      <Divider />
      <KeyHint keys={[
        { key: 'b', desc: 'Back to main screen' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

function ConfirmDeleteModal({
  itemName,
  onConfirm,
  onCancel,
}: {
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { boundKeyboard } = useKeyboard();
  const { columns, rows } = useWindowSize();
  const { top, left } = center(MODAL_W, CONFIRM_H, columns, rows);

  React.useEffect(() => {
    const unbindY = boundKeyboard(['y'], onConfirm);
    const unbindN = boundKeyboard(['n'], onCancel);
    return () => { unbindY(); unbindN(); };
  }, [boundKeyboard, onConfirm, onCancel]);

  return (
    <Box
      position="absolute"
      top={top}
      left={left}
      width={MODAL_W}
      height={CONFIRM_H}
      flexDirection="column"
      borderStyle="round"
      borderColor="red"
      padding={1}
      backgroundColor="black"
    >
      <Text bold color="red">⚠ Confirm Delete</Text>
      <Box marginTop={1}>
        <Text>Are you sure you want to delete "{itemName}"?</Text>
      </Box>
      <Box marginTop={1}>
        <Text>Press <Text bold>y</Text> to confirm, <Text bold>n</Text> to cancel.</Text>
      </Box>
    </Box>
  );
}

function FileInfoModal({
  fileName,
  fileSize,
  onClose,
}: {
  fileName: string;
  fileSize: string;
  onClose: () => void;
}) {
  const { boundKeyboard } = useKeyboard();
  const { columns, rows } = useWindowSize();
  const { top, left } = center(MODAL_W, INFO_H, columns, rows);

  React.useEffect(() => {
    const unbindEsc = boundKeyboard(['escape'], onClose);
    return unbindEsc;
  }, [boundKeyboard, onClose]);

  return (
    <Box
      position="absolute"
      top={top}
      left={left}
      width={MODAL_W}
      height={INFO_H}
      flexDirection="column"
      borderStyle="round"
      borderColor="blue"
      padding={1}
      backgroundColor="black"
    >
      <Text bold color="blue">File Info</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>Name: {fileName}</Text>
        <Text>Size: {fileSize}</Text>
        <Text>Type: Text file</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Escape to close</Text>
      </Box>
    </Box>
  );
}

registerComponent(MainScreen, {});
registerComponent(SubScreen, {}, { parent: MainScreen });

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
