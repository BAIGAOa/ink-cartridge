import React, { useEffect, useState } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  ConfirmDialog,
  useScreenSystem,
  useKeyboard,
  closeOverlay,
} from '../../src/index.js';

function MainScreen() {
  const { boundKeyboard, globalKeys } = useKeyboard();
  const { openOverlay: showOverlay } = useScreenSystem();
  const [dirty, setDirty] = useState(true);

  useEffect(() => {
    globalKeys([
      {
        key: 'escape',
        operate: () => {
          if (dirty) {
            showOverlay('confirm-dialog', ConfirmDialog, {
              title: 'Discard changes',
              message: 'You have unsaved changes. Are you sure you want to quit?',
              confirmLabel: 'Discard and quit',
              cancelLabel: 'Keep editing',
              onConfirm: () => process.exit(0),
              onCancel: () => closeOverlay('confirm-dialog'),
            });
          } else {
            process.exit(0);
          }
        },
      },
    ]);

    const unbindS = boundKeyboard(['s'], () =>
      setDirty((prev) => !prev),
    );

    return () => {
      unbindS();
    };
  }, [dirty]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Editor</Text>
      <Text dimColor>
        Esc: exit | S: toggle dirty (now: {dirty ? 'unsaved' : 'saved'})
      </Text>
      <Box marginTop={1}>
        <Text>Editing...</Text>
      </Box>
    </Box>
  );
}

registerComponent(MainScreen, {});
registerComponent(ConfirmDialog, {
  title: '',
  message: '',
  onConfirm: () => {},
  onCancel: () => {},
});

render(
  <ScenarioManagementProvider defaultScreen={MainScreen}>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
