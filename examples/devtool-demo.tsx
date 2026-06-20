/**
 * DevTool Demo
 *
 * Demonstrates the DevTool debug panel alongside core ink-kit features:
 * screen navigation (skip / back / gotoScreen), multi-overlay, global keys,
 * focus targets, keyboard sequences, blockedKey, stop, onlyThis, and times.
 *
 * Press Ctrl+D to toggle the DevTool panel — it displays the live screen stack,
 * active overlays, and all keyboard bindings in real time.
 *
 * Run:
 *   npx tsx examples/devtool-demo.tsx
 */

import React, { useEffect, useRef, useState } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useScreenSystem,
  useKeyboard,
  useFocusState,
  openDevTool,
  closeDevTool,
} from '../src/index.js';

interface SettingsProps {
  page?: string;
}

function Settings({ page = 'general' }: SettingsProps) {
  const { back, skip } = useScreenSystem();
  const { boundKeyboard, stop } = useKeyboard();

  // Stable refs for callbacks used inside the empty-deps keyboard effect
  const backRef = useRef(back);
  backRef.current = back;
  const skipRef = useRef(skip);
  skipRef.current = skip;

  useEffect(() => {
    const unEsc = boundKeyboard(['escape'], () => backRef.current());
    const unAdv = boundKeyboard(['a'], () => skipRef.current(Advanced, { section: 'network' }));
    // Stop 's' from propagating to layers below so the Home screen's 's' binding
    // (which navigates to Settings) doesn't fire from inside Settings itself.
    const unStop = stop(['s']);
    return () => {
      unEsc();
      unAdv();
      unStop();
    };
  }, [boundKeyboard, stop]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">
        Settings — {page}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>  Escape: back to Home</Text>
        <Text dimColor>  A: go to Advanced</Text>
        <Text dimColor>  s: stopped (blocked from screen below)</Text>
      </Box>
    </Box>
  );
}
Settings.displayName = 'Settings';

interface AdvancedProps {
  section?: string;
}

function Advanced({ section = 'general' }: AdvancedProps) {
  const { back } = useScreenSystem();
  const { boundKeyboard, focusSet, focusUnregister } = useKeyboard();
  const opt1Focused = useFocusState('opt-1');
  const opt2Focused = useFocusState('opt-2');

  const backRef = useRef(back);
  backRef.current = back;

  useEffect(() => {
    const unEsc = boundKeyboard(['escape'], () => backRef.current());
    const unOpt1 = boundKeyboard(['return'], () => {}, { focusId: 'opt-1' });
    const unOpt2 = boundKeyboard(['return'], () => {}, { focusId: 'opt-2' });
    focusSet('opt-1');
    return () => {
      unEsc();
      unOpt1();
      unOpt2();
    };
  }, [boundKeyboard, focusSet]);

  // Separate effect for focusUnregister — only on unmount, per CLAUDE.md focus lifecycle rule
  const focusIdsRef = useRef(['opt-1', 'opt-2']);
  useEffect(() => {
    return () => {
      for (const id of focusIdsRef.current) {
        focusUnregister(id);
      }
    };
  }, [focusUnregister]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="magenta">
        Advanced — {section}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>  Escape: back to Settings</Text>
        <Text dimColor>  Tab/Shift+Tab: switch focus</Text>
      </Box>
      <Box marginTop={1} gap={2}>
        <Text color={opt1Focused ? 'green' : 'grey'} bold={opt1Focused}>
          [Option 1{opt1Focused ? ' ✓' : ''}]
        </Text>
        <Text color={opt2Focused ? 'green' : 'grey'} bold={opt2Focused}>
          [Option 2{opt2Focused ? ' ✓' : ''}]
        </Text>
      </Box>
    </Box>
  );
}
Advanced.displayName = 'Advanced';

interface NotifyProps {
  message?: string;
  onConfirm?: () => void;
}

/**
 * A simple notification overlay. Multiple instances can coexist with different
 * IDs. Press Escape or Enter to close.
 */
function NotifyOverlay({ message = '', onConfirm }: NotifyProps) {
  const { closeOverlay: cl, displayedOverlays, activeOverlayIds } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  const clRef = useRef(cl);
  clRef.current = cl;
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  useEffect(() => {
    const unEsc = boundKeyboard(['escape'], () => clRef.current('notify-main'));
    const unEnter = boundKeyboard(['return'], () => {
      onConfirmRef.current?.();
      clRef.current('notify-main');
    });
    return () => {
      unEsc();
      unEnter();
    };
  }, [boundKeyboard]);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="green"
      paddingX={2}
      paddingY={1}
      width={40}
    >
      <Text bold color="green">
        📬 Notification
      </Text>
      <Box marginY={1}>
        <Text>{message}</Text>
      </Box>
      <Box gap={2}>
        <Text dimColor>Overlays: {displayedOverlays.length}</Text>
        <Text dimColor>Active: {activeOverlayIds.length}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Escape/Enter: close</Text>
      </Box>
    </Box>
  );
}
NotifyOverlay.displayName = 'NotifyOverlay';

/**
 * Main screen with navigation controls, overlay triggers, and the DevTool toggle.
 * All keyboard bindings are registered here so the DevTool can inspect them.
 */
function HomeScreen() {
  const {
    currentPath,
    displayedOverlays,
    activeOverlayIds,
    skip,
    gotoScreen,
    back,
    openOverlay: op,
    closeOverlay: cl,
  } = useScreenSystem();
  const {
    boundKeyboard,
    blockedKey,
    globalKeys,
    globalSequence,
    defineShortcutAction,
  } = useKeyboard();

  const [notifyCount, setNotifyCount] = useState(0);
  const [devToolOpen, setDevToolOpen] = useState(false);

  // Keep a ref for devToolOpen so the stale-closure-free keyboard handler
  // always reads the current toggle state without re-registering bindings.
  const devToolOpenRef = useRef(devToolOpen);
  devToolOpenRef.current = devToolOpen;

  const topComponent = currentPath[currentPath.length - 1];
  const topName = (topComponent as any).displayName || (topComponent as any).name || '?';

  // Navigation fns are stable from context (wrapped in useMemo with [] deps),
  // but we still use refs for the keyboard effect to follow the empty-deps pattern.
  const skipRef = useRef(skip);
  skipRef.current = skip;
  const gotoScreenRef = useRef(gotoScreen);
  gotoScreenRef.current = gotoScreen;
  const backRef = useRef(back);
  backRef.current = back;
  const opRef = useRef(op);
  opRef.current = op;
  const clRef = useRef(cl);
  clRef.current = cl;

  // Global keys and sequences are registered once on mount.
  // Using mode: 'replace' here since the demo owns the full global state;
  // real apps with multiple global key consumers should use mode: 'add'.
  useEffect(() => {
    globalKeys(
      [{ key: 'ctrl+q', operate: () => process.exit(0) }],
      { mode: 'replace' },
    );
    globalSequence(
      [{ keys: ['g', 'g'], operate: () => gotoScreenRef.current(HomeScreen, {}) }],
      { mode: 'replace' },
    );
  }, [globalKeys, globalSequence]);

  // Shortcut actions decouple the operation definition from key binding.
  // This lets the DevTool show which keys map to which action IDs.
  useEffect(() => {
    defineShortcutAction([
      {
        actionId: 'notify-action',
        action: () => {
          setNotifyCount((c) => c + 1);
          opRef.current('notify-main', NotifyOverlay, {
            message: `Notification #${notifyCount + 1}`,
            onConfirm: () => clRef.current('notify-main'),
          });
        },
        keys: ['n'],
      },
    ]);
  }, [defineShortcutAction]);

  // Screen-level keyboard bindings.
  // Using empty deps with refs ensures bindings are stable and only registered
  // once on mount. The refs keep the latest callbacks accessible.
  useEffect(() => {
    const unS = boundKeyboard(['s'], () => skipRef.current(Settings, { page: 'display' }));
    const unP = boundKeyboard(['p'], () => gotoScreenRef.current(Advanced, { section: 'about' }));
    const unB = boundKeyboard(['b'], () => backRef.current());

    // Bind via action ID — the keys come from defineShortcutAction above
    const unN = boundKeyboard('notify-action', {});

    // Toggle DevTool panel. Reads from devToolOpenRef to avoid the
    // stale-closure problem — the keyboard handler is registered once
    // on mount, but the toggle state changes on every press.
    const unD = boundKeyboard(['ctrl+d'], () => {
      if (devToolOpenRef.current) {
        closeDevTool();
        setDevToolOpen(false);
      } else {
        openDevTool();
        setDevToolOpen(true);
      }
    });

    // onlyThis: binding only fires when Home is the sole active screen
    // (no overlays present). The DevTool shows this as "onlyThis" flag.
    const unO = boundKeyboard(['o'], () => {
      opRef.current('notify-onlythis', NotifyOverlay, {
        message: 'Opened via onlyThis (no other overlays)',
        onConfirm: () => clRef.current('notify-onlythis'),
      });
    }, { onlyThis: true });

    // times: handler fires every 3rd press. DevTool shows "x3".
    const unT = boundKeyboard(['t'], () => {
      opRef.current('notify-times', NotifyOverlay, {
        message: 'Triggered on 3rd press!',
        onConfirm: () => clRef.current('notify-times'),
      });
    }, { times: 3 });

    // Multi-key sequence: ctrl+w then q to close all overlays.
    // The DevTool shows sequences in the "Sequences" section.
    const unSeq = boundKeyboard(['ctrl+w', 'q'], () => {
      for (const o of displayedOverlays) {
        try { clRef.current(o.id); } catch { /* overlay may already be closed */ }
      }
    });

    // Make 'x' pass through to lower layers (blockedKey = transparent).
    // The DevTool shows this in the "Blocked" count.
    const unBlock = blockedKey(['x']);

    return () => {
      unS();
      unP();
      unB();
      unN();
      unD();
      unO();
      unT();
      unSeq();
      unBlock();
    };
  }, [boundKeyboard, blockedKey]);

  const pathStr = currentPath
    .map((C) => (C as any).displayName || (C as any).name || '?')
    .join(' → ');

  return (
    <Box flexDirection="column" width="100%" padding={1}>
      <Box
        borderStyle="single"
        borderColor="blue"
        paddingX={1}
        justifyContent="space-between"
        width="100%"
      >
        <Text bold color="blue">
          Ink-Kit DevTool Demo
        </Text>
        <Text dimColor>
          {devToolOpen ? '🔍 DevTool: ON' : 'DevTool: OFF'}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text>
          <Text bold>Path: </Text>
          <Text color="cyan">{pathStr}</Text>
        </Text>
      </Box>
      <Box>
        <Text>
          <Text bold>Screen: </Text>
          <Text color="green">{topName}</Text>
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text>
          <Text bold>Overlays: </Text>
          <Text color={displayedOverlays.length > 0 ? 'yellow' : 'grey'}>
            {displayedOverlays.length} open, {activeOverlayIds.length} active
          </Text>
          {displayedOverlays.map((o) => (
            <Text key={o.id} dimColor>
              {' '}[{o.id}]
            </Text>
          ))}
        </Text>
      </Box>

      <Box marginY={1}>
        <Text dimColor>{'─'.repeat(60)}</Text>
      </Box>

      <Text bold underline>Navigation</Text>
      <Box gap={3} marginTop={1}>
        <Box flexDirection="column">
          <Text><Text color="cyan">s</Text><Text dimColor> → Settings</Text></Text>
          <Text><Text color="cyan">p</Text><Text dimColor> → Advanced (gotoScreen)</Text></Text>
          <Text><Text color="cyan">b</Text><Text dimColor> → Back</Text></Text>
        </Box>
        <Box flexDirection="column">
          <Text><Text color="cyan">n</Text><Text dimColor> → Notification overlay</Text></Text>
          <Text><Text color="cyan">o</Text><Text dimColor> → Overlay (onlyThis)</Text></Text>
          <Text><Text color="cyan">t</Text><Text dimColor> → Overlay (x3 times)</Text></Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text bold underline>Keyboard Features</Text>
      </Box>
      <Box gap={3} marginTop={1}>
        <Box flexDirection="column">
          <Text><Text color="cyan">ctrl+w → q</Text><Text dimColor> Sequence: close all overlays</Text></Text>
          <Text><Text color="cyan">g → g</Text><Text dimColor> Global seq: go home</Text></Text>
        </Box>
        <Box flexDirection="column">
          <Text><Text color="cyan">x</Text><Text dimColor> blockedKey (pass-through)</Text></Text>
          <Text><Text color="cyan">ctrl+q</Text><Text dimColor> Global key: quit</Text></Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text bold underline>DevTool</Text>
      </Box>
      <Box marginTop={1}>
        <Text>
          <Text color="cyan" bold>ctrl+d</Text>
          <Text dimColor> Toggle DevTool panel</Text>
          <Text color="yellow"> ← 试试按下这个！</Text>
        </Text>
      </Box>

      <Box marginY={1}>
        <Text dimColor>{'─'.repeat(60)}</Text>
      </Box>

      <Box>
        <Text>
          Notifications opened: <Text color="green">{notifyCount}</Text>
        </Text>
      </Box>
    </Box>
  );
}
HomeScreen.displayName = 'HomeScreen';

registerComponent(HomeScreen, {});
registerComponent(Settings, { page: 'general' }, { parent: HomeScreen });
registerComponent(Advanced, { section: 'general' }, { parent: Settings });
registerComponent(NotifyOverlay, { message: '', onConfirm: () => {} });

render(
  <ScenarioManagementProvider defaultScreen={HomeScreen}>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
