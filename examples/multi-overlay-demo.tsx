/**
 * Multi-Overlay Demo with Absolute Positioning
 *
 * Demonstrates Ink 7.0.1+ absolute coordinate support combined with
 * ink-kit's multi-overlay system. Multiple floating panels can be
 * opened simultaneously, each positioned independently on screen.
 *
 * Run:
 *   npx tsx examples/multi-overlay-demo.tsx
 */

import React, { useEffect, useState } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useScreenSystem,
  useKeyboard,
  useFocusState,
  openOverlay,
  closeOverlay,
} from '../src/index.js';

// ── Types ──────────────────────────────────────────────────────

interface FloatingPanelProps {
  /** Panel title shown in the header bar */
  title: string;
  /** Content text */
  content: string;
  /** Absolute position from top (in rows) */
  top: number;
  /** Absolute position from left (in columns) */
  left: number;
  /** Width in columns */
  width: number;
  /** Height in rows */
  height: number;
  /** Border color */
  color?: string;
  /** Called when the close button is triggered */
  onClose: () => void;
}

// ── Floating Panel Component ──────────────────────────────────

/**
 * A draggable-looking floating panel rendered with absolute positioning.
 * Each instance is an independent overlay that can coexist with others.
 */
function FloatingPanel({
  title,
  content,
  top,
  left,
  width,
  height,
  color = 'cyan',
  onClose,
}: FloatingPanelProps) {
  const { boundKeyboard, focusSet, focusUnregister } = useKeyboard();
  const closeBtnFocused = useFocusState('panel-close');
  const contentFocused = useFocusState('panel-content');

  // Focus management — register two focus targets
  useEffect(() => {
    const unClose = boundKeyboard(
      ['return'],
      () => onClose(),
      { focusId: 'panel-close' },
    );
    const unEsc = boundKeyboard(
      ['escape'],
      () => onClose(),
    );

    // Tab between content area and close button
    const unTab = boundKeyboard(['tab'], () => {
      focusSet('panel-close');
    }, { focusId: 'panel-content' });

    const unShiftTab = boundKeyboard(['tab'], () => {
      focusSet('panel-content');
    }, { focusId: 'panel-close' });

    focusSet('panel-content');

    return () => {
      unClose();
      unEsc();
      unTab();
      unShiftTab();
      focusUnregister('panel-close');
      focusUnregister('panel-content');
    };
  }, [onClose]);

  // Truncate content to fit within the panel
  const maxLines = height - 4; // header + border + padding
  const lines = content.split('\n').slice(0, maxLines);
  while (lines.length < maxLines) lines.push('');

  return (
    <Box
      position="absolute"
      top={top}
      left={left}
      width={width}
      height={height}
      flexDirection="column"
      borderStyle="round"
      borderColor={color}
      paddingX={1}
    >
      {/* Title bar */}
      <Box>
        <Text bold color={color}>
          {'┌─ '}{title}
        </Text>
        <Text dimColor>
          {' '}[Esc/Close]
        </Text>
      </Box>

      <Box height={1}>
        <Text dimColor>{'─'.repeat(width - 4)}</Text>
      </Box>

      {/* Content area */}
      <Box flexDirection="column" marginTop={1}>
        {lines.map((line, i) => (
          <Box key={i}>
            <Text color={contentFocused ? 'white' : undefined}>
              {line || ' '}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Close button */}
      <Box marginTop={1}>
        <Text
          color={closeBtnFocused ? 'red' : 'grey'}
          bold={closeBtnFocused}
          underline={closeBtnFocused}
        >
          {closeBtnFocused ? '▸ [Close] ◂' : '  [Close]  '}
        </Text>
      </Box>
    </Box>
  );
}

// ── Overlay Map Data ───────────────────────────────────────────

interface PanelDef {
  id: string;
  title: string;
  content: string;
  top: number;
  left: number;
  width: number;
  height: number;
  color: string;
}

const PANELS: PanelDef[] = [
  {
    id: 'help',
    title: 'Help',
    content: 'Press keys 1-4\nto toggle panels.\n\nEsc to close\nfocused panel.\n\nCtrl+A to open\nall panels.\n\nCtrl+D to close\nall panels.\n\nCtrl+Q to quit.',
    top: 1,
    left: 2,
    width: 28,
    height: 15,
    color: 'cyan',
  },
  {
    id: 'info',
    title: 'System Info',
    content: `Platform: ${process.platform}\nNode: ${process.version}\nInk: 7.0.3\nink-kit: 3.2.0\n\nTerminal:\n${process.env.TERM || 'unknown'}\n\nColumns: ${process.stdout.columns || '?'}\nRows: ${process.stdout.rows || '?'}`,
    top: 1,
    left: 50,
    width: 34,
    height: 15,
    color: 'green',
  },
  {
    id: 'settings',
    title: 'Settings',
    content: 'Theme: Dark\nFont: Monospace\nTab Size: 2\nAuto-save: On\n\nSound: Off\nNotifications: On\n\nProxy: None\nTimeout: 30s',
    top: 16,
    left: 2,
    width: 26,
    height: 13,
    color: 'yellow',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    content: '[12:01] Build complete\n[12:03] Test passed\n[12:05] Deploy done\n[12:10] PR #42 merged\n[12:15] CI green\n\nNo new alerts.',
    top: 16,
    left: 40,
    width: 30,
    height: 13,
    color: 'magenta',
  },
];

// ── Main Screen ────────────────────────────────────────────────

function MainScreen() {
  const { openOverlay: showOverlay, closeOverlay: hideOverlay, closeAllOverlays: hideAll, displayedOverlays } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const [clock, setClock] = useState('');

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('zh-CN', { hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Keyboard bindings: toggle individual panels with 1-4
  useEffect(() => {
    const openPanel = (def: PanelDef) => {
      // If already open, close it; otherwise open it
      if (displayedOverlays.some((o) => o.id === def.id)) {
        hideOverlay(def.id);
      } else {
        showOverlay(def.id, FloatingPanel, {
          title: def.title,
          content: def.content,
          top: def.top,
          left: def.left,
          width: def.width,
          height: def.height,
          color: def.color,
          onClose: () => closeOverlay(def.id),
        });
      }
    };

    const un1 = boundKeyboard(['1'], () => openPanel(PANELS[0]));
    const un2 = boundKeyboard(['2'], () => openPanel(PANELS[1]));
    const un3 = boundKeyboard(['3'], () => openPanel(PANELS[2]));
    const un4 = boundKeyboard(['4'], () => openPanel(PANELS[3]));

    // Ctrl+A → open all panels
    const unA = boundKeyboard(['ctrl+a'], () => {
      for (const def of PANELS) {
        if (!displayedOverlays.some((o) => o.id === def.id)) {
          // use module-level so we don't capture stale state
          openOverlay(def.id, FloatingPanel, {
            title: def.title,
            content: def.content,
            top: def.top,
            left: def.left,
            width: def.width,
            height: def.height,
            color: def.color,
            onClose: () => closeOverlay(def.id),
          });
        }
      }
    });

    // Ctrl+D → close all panels
    const unD = boundKeyboard(['ctrl+d'], () => hideAll());

    // Ctrl+Q → quit
    const unQ = boundKeyboard(['ctrl+q'], () => process.exit(0));

    return () => {
      un1();
      un2();
      un3();
      un4();
      unA();
      unD();
      unQ();
    };
  }, [displayedOverlays]);

  const openCount = displayedOverlays.length;

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Background / desktop area */}
      <Box
        flexDirection="column"
        width="100%"
        height="100%"
        padding={1}
      >
        {/* Header bar */}
        <Box
          width="100%"
          borderStyle="single"
          borderColor="blue"
          paddingX={1}
          justifyContent="space-between"
        >
          <Box>
            <Text bold color="blue">
              Ink-Kit Multi-Overlay Demo
            </Text>
          </Box>
          <Box gap={2}>
            <Text dimColor>Panels open: {openCount}/4</Text>
            <Text color="yellow">{clock}</Text>
          </Box>
        </Box>

        {/* Desktop grid */}
        <Box marginTop={1} flexDirection="column">
          {/* Row 1 */}
          <Box gap={2} marginBottom={1}>
            <Box width={28} borderStyle="single" borderColor="grey" paddingX={1}>
              <Text dimColor>
                {displayedOverlays.some((o) => o.id === 'help')
                  ? '▣ Help (open)'
                  : '□ Help [press 1]'}
              </Text>
            </Box>
            <Box width={34} borderStyle="single" borderColor="grey" paddingX={1}>
              <Text dimColor>
                {displayedOverlays.some((o) => o.id === 'info')
                  ? '▣ System Info (open)'
                  : '□ System Info [press 2]'}
              </Text>
            </Box>
          </Box>

          {/* Row 2 */}
          <Box gap={2}>
            <Box width={26} borderStyle="single" borderColor="grey" paddingX={1}>
              <Text dimColor>
                {displayedOverlays.some((o) => o.id === 'settings')
                  ? '▣ Settings (open)'
                  : '□ Settings [press 3]'}
              </Text>
            </Box>
            <Box width={30} borderStyle="single" borderColor="grey" paddingX={1}>
              <Text dimColor>
                {displayedOverlays.some((o) => o.id === 'notifications')
                  ? '▣ Notifications (open)'
                  : '□ Notifications [press 4]'}
              </Text>
            </Box>
          </Box>
        </Box>

        {/* Footer help */}
        <Box marginTop={2} flexDirection="column">
          <Box height={1}>
            <Text dimColor>{'─'.repeat(60)}</Text>
          </Box>
          <Box gap={2} marginTop={1}>
            <Text color="cyan">1-4</Text>
            <Text dimColor>Toggle panel</Text>
            <Text>│</Text>
            <Text color="cyan">Ctrl+A</Text>
            <Text dimColor>Open all</Text>
            <Text>│</Text>
            <Text color="cyan">Ctrl+D</Text>
            <Text dimColor>Close all</Text>
            <Text>│</Text>
            <Text color="cyan">Ctrl+Q</Text>
            <Text dimColor>Quit</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Each panel is a separate overlay rendered with Ink's absolute
              positioning. Multiple overlays coexist, each with its own
              focus targets and keyboard bindings.
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Registration ──────────────────────────────────────────────

registerComponent(MainScreen, {});
registerComponent(FloatingPanel, {
  title: '',
  content: '',
  top: 0,
  left: 0,
  width: 30,
  height: 10,
  color: 'cyan',
  onClose: () => {},
});

// ── Render ────────────────────────────────────────────────────

render(
  <ScenarioManagementProvider defaultScreen={MainScreen}>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
