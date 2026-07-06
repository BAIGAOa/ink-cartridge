/**
 * Modal Demo — blocking dialog with absolute keyboard priority.
 *
 * Demonstrates: openModal(), closeModal(), closeAllModals(),
 *               renderNow, persistent, modal zIndex stacking.
 *
 * Modals use position="absolute" so they float on top of the screen
 * rather than rendering below it, following the devTool pattern.
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
  openModal,
  closeModal,
  closeAllModals,
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

  React.useEffect(() => {
    const unbindD = boundKeyboard(['d'], () => {
      setLastAction('Opened delete confirmation modal');
      openModal('confirm-delete', ConfirmDeleteModal, {
        top: 0, left: 0,
        itemName: 'readme.txt',
        onConfirm: () => {
          setLastAction('Deleted: readme.txt');
          closeModal('confirm-delete');
        },
        onCancel: () => {
          setLastAction('Delete cancelled');
          closeModal('confirm-delete');
        },
      });
    });
    const unbindI = boundKeyboard(['i'], () => {
      setLastAction('Opened info modal (lower zIndex, renderNow)');
      openModal('file-info', FileInfoModal, {
        top: 0, left: 0,
        fileName: 'readme.txt',
        fileSize: '12.4 KB',
      }, { renderNow: true, zIndex: 0 });
    });
    const unbindX = boundKeyboard(['x'], () => {
      closeAllModals();
      setLastAction('All modals closed');
    });
    const unbindS = boundKeyboard(['s'], () => {
      setLastAction('Skipping to Sub screen (non-persistent modals auto-close)');
      skip(SubScreen, {});
    });
    const unbindJ = boundKeyboard(['j'], () => {
      setLastAction(`j pressed — this only works with no modal active`);
    });
    return () => { unbindD(); unbindI(); unbindX(); unbindS(); unbindJ(); };
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Modal Demo — File Manager</Text>
      <Text dimColor>Press d to delete · i for info · x to close all modals · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>Files:</Text>
        <Text>  📄 readme.txt (12.4 KB)</Text>
        <Text>  📄 config.json (2.1 KB)</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Last action:</Text>
        {lastAction ? <Text color="green">{lastAction}</Text> : <Text dimColor>(press a key)</Text>}
        <Text dimColor>
          When a modal is active, the j key is blocked — try pressing j with a modal open!
        </Text>
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'd', desc: 'Delete file (modal)' },
        { key: 'i', desc: 'File info (renderNow modal)' },
        { key: 'x', desc: 'Close all modals' },
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
      <Text bold underline>Modal Demo — Sub Screen</Text>
      <Text dimColor>Non-persistent modals are auto-closed when navigating here.</Text>
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
  top: _top,
  left: _left,
  itemName,
  onConfirm,
  onCancel,
}: {
  top: number;
  left: number;
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
  top: _top,
  left: _left,
  fileName,
  fileSize,
}: {
  top: number;
  left: number;
  fileName: string;
  fileSize: string;
}) {
  const { boundKeyboard } = useKeyboard();
  const { columns, rows } = useWindowSize();
  const { top, left } = center(MODAL_W, INFO_H, columns, rows);

  React.useEffect(() => {
    const unbindEsc = boundKeyboard(['escape'], () => closeModal('file-info'));
    return unbindEsc;
  }, [boundKeyboard]);

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
registerComponent(ConfirmDeleteModal, { top: 0, left: 0, itemName: '', onConfirm: () => {}, onCancel: () => {} });
registerComponent(FileInfoModal, { top: 0, left: 0, fileName: '', fileSize: '' });

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
