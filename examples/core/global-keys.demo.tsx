/**
 * Global Keys Demo — app-wide keyboard shortcuts with category, cover, and when.
 *
 * Demonstrates: globalKeys() with cover, affectOverlay, category, when, times, observer.
 *
 * Key concepts:
 *   - cover: false → screen can override the global key locally
 *   - affectOverlay: true → fires before overlays (higher priority)
 *   - category → whitelist which screens can use this global key
 *   - when → conditionally fires the global key
 *   - times → require multiple presses (with observer feedback)
 *
 * Run:
 *   npx tsx examples/core/global-keys.demo.tsx
 */
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useWindowSize } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useKeyboard,
  skip,
  back,
  Divider,
  KeyHint,
} from '../../src/index.js';

function HomeScreen() {
  const [lastAction, setLastAction] = useState('');
  const { boundKeyboard } = useKeyboard();

  // Screen-level override: the global 'escape' has cover: false,
  // so this screen can override it locally.
  useEffect(() => {
    // If we bind escape, it overrides the global escape (because cover: false)
    // Comment this out to see the global escape take effect on this screen too.
    // const unbindEsc = boundKeyboard(['escape'], () => {
    //   setLastAction('Home screen overrode escape (global has cover: false)');
    // });
    const unbindS = boundKeyboard(['s'], () => skip(AboutScreen, {}));
    const unbindJ = boundKeyboard(['j'], () => {
      setLastAction('j key pressed on Home screen');
    });
    return () => { /* unbindEsc(); */ unbindS(); unbindJ(); };
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Global Keys Demo — Home Screen</Text>
      <Text dimColor>Press s for About · Press escape to exit · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>You are on the Home screen.</Text>
        <Text dimColor>The global F1 key has category: [HomeScreen] — it only works here.</Text>
      </Box>

      {lastAction ? (
        <Box marginTop={1}>
          <Text color="green">{lastAction}</Text>
        </Box>
      ) : null}

      <Divider />
      <KeyHint keys={[
        { key: 'escape', desc: 'Global quit (unless screen overrides)' },
        { key: 'F1', desc: 'Global help (Home screen only)' },
        { key: 's', desc: 'Go to About screen' },
        { key: 'j', desc: 'Test key (always works on screens)' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

function AboutScreen() {
  const [lastAction, setLastAction] = useState('');
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    const unbindB = boundKeyboard(['b'], () => back());
    const unbindJ = boundKeyboard(['j'], () => {
      setLastAction('j key pressed on About screen');
    });
    return () => { unbindB(); unbindJ(); };
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Global Keys Demo — About Screen</Text>
      <Text dimColor>Press b to go back · Press escape to exit · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>You are on the About screen.</Text>
        <Text dimColor>F1 does NOT work here — category is restricted to HomeScreen.</Text>
        <Text dimColor>Escape still works globally (category: '*').</Text>
      </Box>

      {lastAction ? (
        <Box marginTop={1}>
          <Text color="green">{lastAction}</Text>
        </Box>
      ) : null}

      <Divider />
      <KeyHint keys={[
        { key: 'escape', desc: 'Global quit' },
        { key: 'b', desc: 'Back to Home' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

registerComponent(HomeScreen, {});
registerComponent(AboutScreen, {}, { parent: HomeScreen });

function App() {
  const { boundKeyboard, globalKeys } = useKeyboard();
  const [helpShown, setHelpShown] = useState(false);
  const [mutePresses, setMutePresses] = useState(0);
  const { columns, rows } = useWindowSize();
  const HELP_W = 48;
  const HELP_H = 8;
  const helpTop = Math.max(0, Math.floor((rows - HELP_H) / 2));
  const helpLeft = Math.max(0, Math.floor((columns - HELP_W) / 2));

  // Global keys are registered once at the top level.
  // They work from any screen, subject to category and when constraints.
  useEffect(() => {
    globalKeys([
      {
        key: 'escape',
        operate: () => process.exit(0),
        cover: false, // screens CAN override this global key
        category: '*', // works on all screens
        affectOverlay: false,
      },
      {
        key: 'f1',
        operate: () => setHelpShown((prev) => !prev),
        category: [HomeScreen], // only works when HomeScreen is the top screen
        affectOverlay: false,
      },
      {
        // Demonstrate times + observer: press M 3 times to toggle mute
        key: 'm',
        operate: () => {
          setMutePresses(0);
        },
        times: 3,
        observer: (remaining: number) => {
          setMutePresses(remaining);
        },
        category: '*',
        affectOverlay: false,
      },
    ], { mode: 'replace' });
    return () => globalKeys([], { mode: 'replace' });
  }, [globalKeys]);

  // Quit key at the App level (alternative to global escape)
  useEffect(() => {
    const unbind = boundKeyboard(['q'], () => process.exit(0));
    return unbind;
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column">
      <CurrentScreen />
      {helpShown && (
        <Box
          position="absolute"
          top={helpTop}
          left={helpLeft}
          width={HELP_W}
          height={HELP_H}
          flexDirection="column"
          borderStyle="round"
          borderColor="cyan"
          padding={1}
          backgroundColor="black"
        >
          <Text bold color="cyan">Global Keys Help (F1)</Text>
          <Text dimColor>escape → Quit (cover: false — screens can override)</Text>
          <Text dimColor>F1 → This help (category: [HomeScreen] only)</Text>
          <Text dimColor>m×3 → Mute toggle demo (times: 3)</Text>
          <Text color="yellow">Press F1 again to dismiss</Text>
        </Box>
      )}
      {mutePresses > 0 && (
        <Box padding={1}>
          <Text dimColor>Press m {mutePresses} more time(s) to trigger mute...</Text>
        </Box>
      )}
    </Box>
  );
}
registerComponent(App, {});

render(
  <ScenarioManagementProvider defaultScreen={HomeScreen} fullScreen>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
