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
} from '../../src/index.js';

function MainScreen() {
  const { boundKeyboard, globalKeys } = useKeyboard();
  const { openModalLayer, applyElementToModalLayer, closeModalLayer } = useScreenSystem();
  const [dirty, setDirty] = useState(true);

  useEffect(() => {
    globalKeys([
      {
        key: 'escape',
        operate: () => {
          if (dirty) {
            openModalLayer('confirm-dialog', 100);
            applyElementToModalLayer('confirm-dialog', {
              elementId: 'confirm-dialog-element',
              element: () => (
                <ConfirmDialog
                  title="Discard changes"
                  message="You have unsaved changes. Are you sure you want to quit?"
                  confirmLabel="Discard and quit"
                  cancelLabel="Keep editing"
                  onConfirm={() => process.exit(0)}
                  onCancel={() => closeModalLayer('confirm-dialog')}
                />
              ),
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
  }, [applyElementToModalLayer, boundKeyboard, closeModalLayer, dirty, globalKeys, openModalLayer]);

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

render(
  <ScenarioManagementProvider defaultScreen={MainScreen}>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
