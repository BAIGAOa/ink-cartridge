/**
 * Navigation Demo — multi-screen tree navigation.
 *
 * Demonstrates: registerComponent(parent), skip(), back(), gotoScreen().
 *
 * Run:
 *   npx tsx examples/core/navigation.demo.tsx
 */
import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import { Divider } from '@cartridge-engine/divider';
import { KeyHint } from '@cartridge-engine/key-hint';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useKeyboard,
  skip,
  back,
  gotoScreen,
} from '../../src/index.js';

function HomeScreen() {
  const { boundKeyboard } = useKeyboard();

  React.useEffect(() => {
    const unbind = boundKeyboard(['return'], () => skip(DetailScreen, { from: 'Home' }));
    return unbind;
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Navigation Demo — Home Screen</Text>
      <Text dimColor>Press Enter to go to Detail · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>You are on the Home screen.</Text>
        <Text dimColor>The navigation tree: Home → Detail, Home → Settings</Text>
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'Enter', desc: 'Go to Detail screen' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

function DetailScreen({ from = '' }: { from?: string }) {
  const { boundKeyboard } = useKeyboard();
  const [lastAction, setLastAction] = useState('');

  React.useEffect(() => {
    const unbindB = boundKeyboard(['b'], () => {
      setLastAction('Pressed b → going back to Home');
      back();
    });
    const unbindS = boundKeyboard(['s'], () => {
      setLastAction('Pressed s → jumping to Settings via gotoScreen');
      gotoScreen(SettingsScreen, { from: 'Detail' });
    });
    // Skipping to the current screen with onlyAttribute: true updates the
    // props without remounting — the lastAction line below survives.
    const unbindR = boundKeyboard(['r'], () => {
      setLastAction('Pressed r → props refreshed, state preserved');
      skip(DetailScreen, { from: 'Detail (refreshed)' }, { onlyAttribute: true });
    });
    // Without onlyAttribute the current screen is remounted, so the
    // lastAction state resets to empty.
    const unbindM = boundKeyboard(['m'], () => {
      setLastAction('Pressed m → remounted, state will reset');
      skip(DetailScreen, { from: 'Detail (remounted)' });
    });
    return () => { unbindB(); unbindS(); unbindR(); unbindM(); };
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Navigation Demo — Detail Screen</Text>
      <Text dimColor>Navigated from: {from}</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>You are on the Detail screen.</Text>
        {lastAction ? <Text color="green">{lastAction}</Text> : null}
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'b', desc: 'Back to Home' },
        { key: 's', desc: 'gotoScreen → Settings' },
        { key: 'r', desc: 'Refresh self, keep state (onlyAttribute)' },
        { key: 'm', desc: 'Remount self, reset state' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

function SettingsScreen({ from = '' }: { from?: string }) {
  const { boundKeyboard } = useKeyboard();
  const [lastAction, setLastAction] = useState('');

  React.useEffect(() => {
    const unbindH = boundKeyboard(['h'], () => {
      setLastAction('Pressed h → jumping to Home via gotoScreen');
      gotoScreen(HomeScreen, {});
    });
    const unbindB = boundKeyboard(['b'], () => {
      setLastAction('Pressed b → going back one level');
      back();
    });
    const unbindD = boundKeyboard(['d'], () => {
      setLastAction('Pressed d → this key only works in Settings');
    });
    return () => { unbindH(); unbindB(); unbindD(); };
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Navigation Demo — Settings Screen</Text>
      <Text dimColor>Navigated from: {from}</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>You are on the Settings screen.</Text>
        <Text dimColor>
          gotoScreen() uses LCA (lowest common ancestor) to jump across branches.
        </Text>
        {lastAction ? <Text color="green">{lastAction}</Text> : null}
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'h', desc: 'gotoScreen → Home' },
        { key: 'b', desc: 'Back to previous screen' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

registerComponent(HomeScreen, {});
registerComponent(DetailScreen, {}, { parent: HomeScreen });
registerComponent(SettingsScreen, {}, { parent: HomeScreen });

// App wrapper: provides global quit key
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
  <ScenarioManagementProvider defaultScreen={HomeScreen} fullScreen>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
