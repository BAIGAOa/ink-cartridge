import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Box, Text, useWindowSize } from "ink";
import { useScreenSystem } from "../screen/hook.js";
import { useKeyboard, useModalMissListener } from "../keyboard/hook.js";
import { ModalContext } from "../screen/ModalContext.js";
import { DevProps } from "./types.js";
import { registerComponent } from "../screen/registry.js";
import { closeDevTool } from "./entrance.js";


const PANEL_HEIGHT = 30;

/**
 * Developer debugging modal for the ink-cartridge screen system.
 *
 * Renders as an absolutely-positioned panel showing real-time navigation
 * state: the current screen path as a breadcrumb, a list of open overlays
 * (green = active, gray = inactive), open modals, screen count, and the
 * panel's vertical offset.
 *
 * Keyboard controls (bound on mount):
 * - **↑ / ↓** — move the panel vertically, clamped to the terminal bounds.
 *   The position automatically re-clamps on terminal resize so the panel
 *   never drifts off-screen.
 * - **Escape** — close the DevScreen modal.
 *
 * Must be opened via {@link openDevTool} (which calls `openModal`).
 * The panel registers itself via `registerComponent` so it participates
 * in the modal keyboard layer automatically.
 *
 * As a modal, DevScreen blocks all keyboard events from reaching overlays
 * and screens while open.
 *
 * @param top   - Initial vertical position in rows (0 = top of terminal).
 * @param left  - Horizontal position in columns.
 *
 * @example
 * ```ts
 * // Open from any screen or keyboard handler:
 * import { openDevTool } from 'ink-cartridge/dev';
 * openDevTool({ top: 0, left: 0 });
 * ```
 *
 * @2026-06-23 3.6.1
 */
export function DevScreen({top: initialTop, left}: DevProps){
  const {
    currentPath,
    displayedOverlays,
    activeOverlayIds,
    modalQueue,
    activeModalId,
  } = useScreenSystem()
  const {boundKeyboard} = useKeyboard()
  const modalId = useContext(ModalContext)
  const {rows} = useWindowSize()

  const [offsetTop, setOffsetTop] = useState(initialTop)
  const [flashBorder, setFlashBorder] = useState(false)
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Stable ref so the []-deps keyboard effect always reads the latest
  // rows-based clamp, preventing a stale-closure on the initial size.
  const clampTopRef = useRef((next: number) => next)
  clampTopRef.current = (next: number) =>
    Math.max(0, Math.min(next, rows - PANEL_HEIGHT))

  useModalMissListener(
    useCallback((evt) => {
      if (evt.miss) {
        setFlashBorder(true);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => {
          setFlashBorder(false);
          flashTimerRef.current = null;
        }, 200);
      }
    }, []),
  );

  // Cleanup flash timer on unmount
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const u1 = boundKeyboard(['up'], () =>
      setOffsetTop(prev => clampTopRef.current(prev - 1)),
    )
    const u2 = boundKeyboard(['down'], () =>
      setOffsetTop(prev => clampTopRef.current(prev + 1)),
    )
    const u3 = boundKeyboard(['escape'], () => {
      if (modalId) closeDevTool();
    })
    return () => {
      u1()
      u2()
      u3()
    }
  }, [modalId])

  // When the terminal is resized the current position may land outside
  // the new bounds — re-clamp so the panel stays visible immediately.
  useEffect(() => {
    setOffsetTop(prev => clampTopRef.current(prev))
  }, [rows])

  return(
    <Box
      borderColor={flashBorder ? 'yellow' : 'blue'}
      borderStyle='round'
      position="absolute"
      top={offsetTop}
      left={left}
      height={PANEL_HEIGHT}
      width='100%'
      flexDirection="column"
      paddingX={1}
      paddingY={1}
      backgroundColor='black'
    >
      {/* Path breadcrumb */}
      <Box flexDirection="row">
        <Text color="cyan" bold>Path </Text>
        {currentPath.map((component, index) => {
          const name = component.displayName || component.name || 'Unknown';
          const isLast = index === currentPath.length - 1;
          return (
            <Box key={index} flexDirection="row">
              <Text color="gray"> {'>'} </Text>
              <Text color={isLast ? 'yellow' : 'gray'} bold={isLast}>
                {name}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Overlay list */}
      <Box flexDirection="row" paddingTop={1}>
        <Text color="cyan">Overlays </Text>
        <Text dimColor>({displayedOverlays.length})</Text>
        {displayedOverlays.length === 0 ? (
          <Text color="gray"> — none</Text>
        ) : (
          displayedOverlays.map((entry, i) => {
            const name = entry.component.displayName || entry.component.name || 'Unknown';
            const active = activeOverlayIds.includes(entry.id);
            return (
              <Box key={entry.id} flexDirection="row">
                <Text color="gray">{i > 0 ? ', ' : ' — '}</Text>
                <Text color={active ? 'green' : 'gray'}>{name}</Text>
              </Box>
            );
          })
        )}
      </Box>

      {/* Modal list */}
      <Box flexDirection="row" paddingTop={0}>
        <Text color="cyan">Modals </Text>
        <Text dimColor>({modalQueue.length})</Text>
        {modalQueue.length === 0 ? (
          <Text color="gray"> — none</Text>
        ) : (
          modalQueue.map((entry, i) => {
            const name = entry.component.displayName || entry.component.name || 'Unknown';
            const active = entry.id === activeModalId;
            return (
              <Box key={entry.id} flexDirection="row">
                <Text color="gray">{i > 0 ? ', ' : ' — '}</Text>
                <Text color={active ? 'green' : 'gray'}>{name}</Text>
              </Box>
            );
          })
        )}
      </Box>

      {/* Divider */}
      <Box width='100%' paddingY={1}>
        <Text color="blue" dimColor>{"─".repeat(60)}</Text>
      </Box>

      {/* Info area */}
      <Box flexDirection="column">
        <Text dimColor>
          Screens: {currentPath.length}  |  ↑↓ Move  |  Esc Close
        </Text>
        <Text dimColor>
          Top: {offsetTop}/{rows - PANEL_HEIGHT}
        </Text>
      </Box>
    </Box>
  )
}

registerComponent(DevScreen, {top: 0, left: 0})
