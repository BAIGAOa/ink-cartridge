import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useWindowSize } from "ink";
import { useScreenSystem } from "../screen/hook.js";
import { useKeyboard, useModalMissListener } from "../keyboard/hook.js";
import { ModalContext } from "../screen/ModalContext.js";
import { DevProps } from "./types.js";
import { registerComponent } from "../screen/registry.js";
import { closeDevTool } from "./entrance.js";
import GlobalKeyDisplayBox from "./globalKey-display.js";
import LayerKeyDisplayBox from "./layerKey-display.js";
import GlobalSequenceDisplayBox from "./globalSeq-display.js";
import type { ScreenKeyboardLayer } from "../keyboard/types.js";


const PANEL_HEIGHT = 30;

// ---- Focus target entry collected from a layer ----

interface FocusEntry {
  /** Display name of the owning layer (e.g. screen name, "overlay:xxx", "modal:xxx"). */
  layerName: string;
  /** The focus target id. */
  focusId: string;
  /** Whether this is the currently active focus on its layer. */
  isCurrent: boolean;
}

/**
 * Collect all focus targets from every accessible layer:
 * screen stack (bottom → top), active overlays, and the active modal.
 *
 * Each entry records its layer name, focus id, and whether it is the
 * active focus on its owning layer.  Only layers that actually have
 * registered focus targets contribute entries.
 */
function collectAllFocusTargets(
  currentPath: React.ComponentType<any>[],
  activeOverlayIds: string[],
  activeModalId: string | null,
  readLayer: (owner: React.ComponentType<any> | string) => ScreenKeyboardLayer | undefined,
): FocusEntry[] {
  const entries: FocusEntry[] = [];

  // Screen layers — from root to top
  for (const component of currentPath) {
    const layer = readLayer(component);
    if (!layer || layer.focusOrder.length === 0) continue;
    const name = component.displayName || component.name || 'Unknown';
    for (const focusId of layer.focusOrder) {
      entries.push({
        layerName: name,
        focusId,
        isCurrent: focusId === layer.currentFocusId,
      });
    }
  }

  // Active overlay layers
  for (const overlayId of activeOverlayIds) {
    const layer = readLayer(overlayId);
    if (!layer || layer.focusOrder.length === 0) continue;
    for (const focusId of layer.focusOrder) {
      entries.push({
        layerName: `overlay:${overlayId}`,
        focusId,
        isCurrent: focusId === layer.currentFocusId,
      });
    }
  }

  // Active modal layer
  if (activeModalId) {
    const layer = readLayer(activeModalId);
    if (layer && layer.focusOrder.length > 0) {
      for (const focusId of layer.focusOrder) {
        entries.push({
          layerName: `modal:${activeModalId}`,
          focusId,
          isCurrent: focusId === layer.currentFocusId,
        });
      }
    }
  }

  return entries;
}

// ---- All-focus display component ----

interface AllFocusSummaryProps {
  currentPath: React.ComponentType<any>[];
  activeOverlayIds: string[];
  activeModalId: string | null;
  readLayer: (owner: React.ComponentType<any> | string) => ScreenKeyboardLayer | undefined;
}

/**
 * Renders every registered focus target from every active layer.
 *
 * Each row shows `[layerName] focusId` where:
 * - **green** — the focus target that is currently active on its layer
 * - **gray**  — an inactive focus target
 * - a trailing `◀` marks the active one.
 *
 * If no focus targets exist anywhere, a single "— none" line is shown.
 */
function AllFocusSummary({ currentPath, activeOverlayIds, activeModalId, readLayer }: AllFocusSummaryProps) {
  const entries = useMemo(
    () => collectAllFocusTargets(currentPath, activeOverlayIds, activeModalId, readLayer),
    [currentPath, activeOverlayIds, activeModalId, readLayer],
  );

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color="cyan">Focus Targets </Text>
        <Text dimColor>({entries.length})</Text>
      </Box>
      {entries.length === 0 ? (
        <Box paddingY={1}>
          <Text color="gray">  — none</Text>
        </Box>
      ) : (
        entries.map((entry, i) => (
          <Box key={`${entry.layerName}-${entry.focusId}-${i}`} flexDirection="row">
            <Text color="gray">  [{entry.layerName}] </Text>
            <Text color={entry.isCurrent ? 'green' : 'gray'}>
              {entry.focusId}{entry.isCurrent ? ' ◀' : ''}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
}

// ---- Inline keyboard-layer summary displayed inside DevScreen ----

interface LayerSummaryProps {
  topComponent: React.ComponentType<any>;
  readLayer: (owner: React.ComponentType<any> | string) => ScreenKeyboardLayer | undefined;
}

/**
 * Renders a compact summary of the keyboard layer for the top screen
 * component: bindings, sequences, stopped keys, and penetration keys.
 *
 * Focus targets are displayed separately by {@link AllFocusSummary}
 * so that all layers' targets are visible at once.
 */
function LayerSummary({ topComponent, readLayer }: LayerSummaryProps) {
  const layer = readLayer(topComponent);
  if (!layer) {
    return (
      <Box paddingY={1}>
        <Text color="gray">No keyboard layer for this screen.</Text>
      </Box>
    );
  }

  const bindKeys = layer.bindings.map(b => b.keys.join(',')).join(' ');
  const seqCount = [...layer.sequences.values()].reduce((s, a) => s + a.length, 0);
  const seqFirstKeys = [...layer.sequences.keys()].join(' ');
  const stopped = layer.stoppedKeys.map(r =>
    Array.isArray(r.key) ? (r.key as string[]).join(',') : r.key
  ).join(' ');
  const penetrated = layer.penetrationKeys.map(r =>
    Array.isArray(r.key) ? (r.key as string[]).join(',') : r.key
  ).join(' ');

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box flexDirection="row">
        <Text color="cyan">Bind ({layer.bindings.length}): </Text>
        <Text dimColor>{bindKeys || '—'}</Text>
      </Box>
      {seqCount > 0 && (
        <Box flexDirection="row">
          <Text color="cyan">Seq ({seqCount}): </Text>
          <Text dimColor>{seqFirstKeys}</Text>
          {layer.pendingSequence && (
            <Text color="yellow">  [pending: {layer.pendingSequence.sequences.join(',')}]</Text>
          )}
        </Box>
      )}
      {stopped && (
        <Box flexDirection="row">
          <Text color="red">Stopped: </Text>
          <Text dimColor>{stopped}</Text>
        </Box>
      )}
      {penetrated && (
        <Box flexDirection="row">
          <Text color="gray">Penetr: </Text>
          <Text dimColor>{penetrated}</Text>
        </Box>
      )}
    </Box>
  );
}

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
 * As a modal, DevScreen consumes all keyboard events from reaching overlays
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
export function DevScreen({ top: initialTop, left, allowKeys }: DevProps) {
  const {
    currentPath,
    displayedOverlays,
    activeOverlayIds,
    modalQueue,
    activeModalId,
  } = useScreenSystem()
  const { boundKeyboard, readLayer, allowModal } = useKeyboard()
  const modalCtx = useContext(ModalContext)
  const modalId = modalCtx?.id ?? null;
  const { rows } = useWindowSize()
  const { openModal } = useScreenSystem()

  const [offsetTop, setOffsetTop] = useState(initialTop)
  const [flashBorder, setFlashBorder] = useState(false)
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Stable ref so the []-deps keyboard effect always reads the latest
  // rows-based clamp, preventing a stale-closure on the initial size.
  const clampTopRef = useRef((next: number) => next)
  clampTopRef.current = (next: number) =>
    Math.max(0, Math.min(next, rows - PANEL_HEIGHT))

  // Keep a stable ref to currentPath so the []-deps keyboard effect
  // always reads the latest screen for Ctrl+K layer inspection.
  const currentPathRef = useRef(currentPath)
  currentPathRef.current = currentPath

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
    return allowModal(allowKeys ?? [])
  }, [allowModal])

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
    const u4 = boundKeyboard(['ctrl+g'], () => {
      openModal('__global-display__', GlobalKeyDisplayBox, {
        top: initialTop + 3,
        left: left
      })
    })
    const u5 = boundKeyboard(['ctrl+k'], () => {
      const path = currentPathRef.current;
      const topComponent = path[path.length - 1];
      openModal('__layer-display__', LayerKeyDisplayBox, {
        top: initialTop + 3,
        left: left,
        screenComponent: topComponent,
      })
    })
    const u6 = boundKeyboard(['ctrl+s'], () => {
      openModal('__globalSeq-display__', GlobalSequenceDisplayBox, {
        top: initialTop + 3,
        left: left,
      })
    })
    return () => {
      u1()
      u2()
      u3()
      u4()
      u5()
      u6()
    }
  }, [modalId])

  // When the terminal is resized the current position may land outside
  // the new bounds — re-clamp so the panel stays visible immediately.
  useEffect(() => {
    setOffsetTop(prev => clampTopRef.current(prev))
  }, [rows])

  return (
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

      {/* All focus targets across every layer */}
      <AllFocusSummary
        currentPath={currentPath}
        activeOverlayIds={activeOverlayIds}
        activeModalId={activeModalId}
        readLayer={readLayer}
      />

      {/* Divider */}
      <Box width='100%' paddingY={1}>
        <Text color="blue" dimColor>{"─".repeat(60)}</Text>
      </Box>

      {/* Keyboard layer summary (bindings, sequences, etc. for the top screen) */}
      <LayerSummary topComponent={currentPath[currentPath.length - 1]} readLayer={readLayer} />

      {/* Info area */}
      <Box flexDirection="column">
        <Text dimColor>
          Screens: {currentPath.length}  |  ↑↓ Move  |  Esc Close | Ctrl+G GlobalKeys | Ctrl+K LayerKeys | Ctrl+S GlobalSeqs
        </Text>
        <Text dimColor>
          Top: {offsetTop}/{rows - PANEL_HEIGHT}
        </Text>
      </Box>
    </Box>
  )
}

registerComponent(DevScreen, { top: 0, left: 0 })
