/**
 * SettingScreen — app-wide configuration.
 *
 * Reachable from any screen via Ctrl+, (globalKeys).
 * Press Esc or Ctrl+, again to go back.
 */
import React, { useEffect } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { SelectInput, back } from '../../../src/index.js';
import { useKeyboard } from '../../../src/index.js';
import { useApp } from '../context.js';

export default function SettingScreen() {
  const { state, updateSettings } = useApp();
  const { boundKeyboard } = useKeyboard();
  const { rows } = useWindowSize();
  const settings = state.settings;

  useEffect(() => {
    return boundKeyboard(['escape'], () => back(), {});
  }, [boundKeyboard]);

  const confirmItems = [
    { label: 'Yes  (show confirm dialog)', value: 'true' },
    { label: 'No   (delete immediately)', value: 'false' },
  ];

  const hintItems = [
    { label: 'Yes  (show shortcut bar)', value: 'true' },
    { label: 'No   (hide shortcut bar)', value: 'false' },
  ];

  return (
    <Box flexDirection="column" padding={1} height={rows} width="100%">
      <Text bold>⚙️  Settings</Text>
      <Text dimColor>Esc to go back  ·  Ctrl+, toggles this screen</Text>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Confirm before deleting</Text>
        <SelectInput
          focusId="setting-confirm-delete"
          items={confirmItems}
          onSelect={(item) => {
            updateSettings({ confirmBeforeDelete: item.value === 'true' });
          }}
        />

        <Text bold>Show key hints</Text>
        <SelectInput
          focusId="setting-show-hints"
          items={hintItems}
          onSelect={(item) => {
            updateSettings({ showKeyHints: item.value === 'true' });
          }}
        />
      </Box>
    </Box>
  );
}
