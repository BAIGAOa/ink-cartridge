import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { useScreenSystem } from '../screen/hook.js';
import { useKeyboard } from '../keyboard/hook.js';
import type { KeyboardDebugSnapshot, DebugLayerSnapshot } from '../keyboard/context.js';

/**
 * Well-known overlay ID used by the DevTool panel.
 * Consumers should not use this ID for their own overlays.
 */
export const DEVTOOL_OVERLAY_ID = '__ink_devtool__';

export interface DevToolProps {
  /** Override the overlay ID used for self-closing. Defaults to {@link DEVTOOL_OVERLAY_ID}. */
  overlayId?: string;
}

/**
 * Internal dev tool panel that displays debug information about the current
 * screen stack, active overlays, and keyboard bindings.
 *
 * Opened via {@link openDevTool} as an overlay and closed via {@link closeDevTool}
 * or by pressing `q` / `Escape` within the panel.
 */
export function DevTool({ overlayId = DEVTOOL_OVERLAY_ID }: DevToolProps) {
  const {
    currentPath,
    displayedOverlays,
    activeOverlayIds,
    closeOverlay,
  } = useScreenSystem();

  const { _getDebugSnapshot, boundKeyboard } = useKeyboard();

  // Poll the keyboard snapshot periodically since keyboard state (refs)
  // does not trigger React re-renders on its own.
  const [snapshot, setSnapshot] = useState<KeyboardDebugSnapshot>(
    () => _getDebugSnapshot(),
  );

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (mountedRef.current) {
        setSnapshot(_getDebugSnapshot());
      }
    }, 500);
    return () => clearInterval(interval);
  }, [_getDebugSnapshot]);

  // Close via key press
  const closeOverlayRef = useRef(closeOverlay);
  closeOverlayRef.current = closeOverlay;
  const overlayIdRef = useRef(overlayId);
  overlayIdRef.current = overlayId;

  useEffect(() => {
    const unbindEscape = boundKeyboard(['escape'], () => {
      closeOverlayRef.current(overlayIdRef.current);
    });
    const unbindQ = boundKeyboard(['q'], () => {
      closeOverlayRef.current(overlayIdRef.current);
    });
    return () => {
      unbindEscape();
      unbindQ();
    };
  }, [boundKeyboard]);

  const topComponent = currentPath[currentPath.length - 1];
  const topName =
    (topComponent as any)?.displayName ||
    (topComponent as any)?.name ||
    'anonymous';

  // Filter out the DevTool's own overlay layer from the snapshot
  const visibleLayers = snapshot.layers.filter(
    (l) => l.owner !== overlayId,
  );

  // Find the keyboard layer for the current top screen
  const currentLayer: DebugLayerSnapshot | undefined = visibleLayers.find(
    (l) => l.owner === topName && !l.isOverlay,
  );

  // Separate overlay layers from screen layers
  const overlayLayers = snapshot.layers.filter(
    (l) => l.isOverlay && l.owner !== overlayId,
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingLeft={1}
      paddingRight={1}
      width={60}
    >
      {/* Title */}
      <Box>
        <Text bold color="cyan">
          DevTool
        </Text>
        <Text dimColor> (q/Escape to close)</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {/* Screen Stack */}
        <Text bold underline>
          Screen Stack ({currentPath.length}):
        </Text>
        {currentPath.map((Component, idx) => {
          const name =
            (Component as any).displayName ||
            (Component as any).name ||
            'anonymous';
          const isTop = idx === currentPath.length - 1;
          return (
            <Box key={idx} flexDirection="row">
              <Text color={isTop ? 'green' : undefined}>
                {'  '}[{idx}] {name}
                {isTop ? '  ← current' : ''}
              </Text>
            </Box>
          );
        })}

        {/* Active Overlays */}
        <Box flexDirection="column" marginTop={1}>
          <Text bold underline>
            Active Overlays ({displayedOverlays.length}):
          </Text>
          {displayedOverlays.length === 0 ? (
            <Text dimColor>  (none)</Text>
          ) : (
            displayedOverlays.map((entry) => {
              const compName =
                (entry.component as any).displayName ||
                (entry.component as any).name ||
                'anonymous';
              const isActive = activeOverlayIds.includes(entry.id);
              const isSelf = entry.id === overlayId;
              return (
                <Box key={entry.id} flexDirection="row">
                  <Text
                    color={isSelf ? 'cyan' : isActive ? 'green' : 'yellow'}
                  >
                    {'  '}{entry.id}: {compName} (z:{entry.zIndex}
                    {isActive ? ', active' : ', inactive'}
                    {isSelf ? ', this panel' : ''})
                  </Text>
                </Box>
              );
            })
          )}
        </Box>

        {/* Keyboard Layer for top screen */}
        <Box flexDirection="column" marginTop={1}>
          <Text bold underline>
            Keyboard ({topName}):
          </Text>
          {currentLayer ? (
            <>
              {/* Screen-level bindings */}
              <Text>
                {'  '}Screen bindings: {currentLayer.bindings.length}
              </Text>
              {currentLayer.bindings.length > 0 &&
                currentLayer.bindings.map((b, i) => (
                  <Box key={`b-${i}`}>
                    <Text color="blue">
                      {'    '}[{b.keys.join(', ')}]
                      {b.onlyThis ? ' onlyThis' : ''}
                      {b.hasWhen ? ' when' : ''}
                      {b.times !== undefined ? ` x${b.times}` : ''}
                    </Text>
                  </Box>
                ))}

              {/* Blocked + Stopped */}
              <Box>
                <Text>
                  {'  '}Blocked: {currentLayer.blockedKeysCount}
                  {'  '}Stopped: {currentLayer.stoppedKeysCount}
                  {currentLayer.hasPendingSequence
                    ? '  Pending seq: yes'
                    : ''}
                </Text>
              </Box>

              {/* Focus targets */}
              {currentLayer.focusTargets.length > 0 && (
                <>
                  <Text>
                    {'  '}Focus targets ({currentLayer.focusTargets.length}):
                  </Text>
                  {currentLayer.focusTargets.map((ft) => {
                    const active =
                      currentLayer.currentFocusId === ft.id;
                    return (
                      <Box key={ft.id}>
                        <Text color={active ? 'green' : undefined}>
                          {'    '}[{ft.id}
                          {active ? ' ✓' : ''}] bindings:{' '}
                          {ft.bindings.length}
                        </Text>
                      </Box>
                    );
                  })}
                </>
              )}

              {/* Sequences */}
              {currentLayer.sequences.length > 0 && (
                <>
                  <Text>
                    {'  '}Sequences ({currentLayer.sequences.length}):
                  </Text>
                  {currentLayer.sequences.map((s, i) => (
                    <Box key={`seq-${i}`}>
                      <Text color="magenta">
                        {'    '}[{s.keys.join(', ')}]
                      </Text>
                    </Box>
                  ))}
                </>
              )}
            </>
          ) : (
            <Text dimColor>  (no keyboard layer for this screen)</Text>
          )}
        </Box>

        {/* Other overlay layers (excluding devtool itself) */}
        {overlayLayers.map((layer) => (
          <Box key={layer.owner} flexDirection="column" marginTop={1}>
            <Text bold underline>
              Overlay Keyboard ({layer.owner}):
            </Text>
            <Text>
              {'  '}Bindings: {layer.bindings.length}
              {'  '}Blocked: {layer.blockedKeysCount}
              {'  '}Stopped: {layer.stoppedKeysCount}
            </Text>
            {layer.bindings.length > 0 &&
              layer.bindings.map((b, i) => (
                <Box key={`obl-${i}`}>
                  <Text color="blue">
                    {'    '}[{b.keys.join(', ')}]
                    {b.onlyThis ? ' onlyThis' : ''}
                    {b.hasWhen ? ' when' : ''}
                  </Text>
                </Box>
              ))}
            {layer.currentFocusId && (
              <Text>{'  '}Focus: {layer.currentFocusId}</Text>
            )}
          </Box>
        ))}

        {/* Global Keys */}
        <Box flexDirection="column" marginTop={1}>
          <Text bold underline>
            Global Keys ({snapshot.globalKeys.length}):
          </Text>
          {snapshot.globalKeys.length === 0 ? (
            <Text dimColor>  (none)</Text>
          ) : (
            snapshot.globalKeys.map((gk, i) => {
              const keyStr = Array.isArray(gk.keys)
                ? gk.keys.join(', ')
                : gk.keys;
              return (
                <Box key={`gk-${i}`}>
                  <Text color="yellow">
                    {'  '}[{keyStr}] ao:{String(gk.affectOverlay)}{' '}
                    cover:{String(gk.cover)}
                    {gk.hasWhen ? ' when' : ''}
                    {gk.times !== undefined ? ` x${gk.times}` : ''}
                  </Text>
                </Box>
              );
            })
          )}
        </Box>

        {/* Global Sequences */}
        <Box flexDirection="column" marginTop={1}>
          <Text bold underline>
            Global Sequences ({snapshot.globalSequences.length}):
          </Text>
          {snapshot.globalSequences.length === 0 ? (
            <Text dimColor>  (none)</Text>
          ) : (
            snapshot.globalSequences.map((gs, i) => (
              <Box key={`gs-${i}`}>
                <Text color="yellow">
                  {'  '}[{gs.keys.join(', ')}] ao:{String(gs.affectOverlay)}{' '}
                  cover:{String(gs.cover)}
                  {gs.hasWhen ? ' when' : ''}
                </Text>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}
