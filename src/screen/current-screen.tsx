import React from 'react';
import { Box } from 'ink';
import { useScreenSystem } from './hook.js';
import { OverlayContext } from './OverlayContext.js';

/**
 * Render the current screen and any active overlays.
 *
 * Multiple overlays are rendered in zIndex order (ascending) so higher
 * zIndex overlays appear on top. Each overlay is wrapped in an
 * OverlayContext.Provider so the keyboard system can isolate per-overlay
 * keyboard layers by overlay ID.
 */
export function CurrentScreen(): React.ReactNode {
  const { currentScreen, currentOverlays, displayedOverlays } = useScreenSystem();

  // Build overlay elements with OverlayContext wrappers
  const wrappedOverlays = currentOverlays.map((overlayNode, i) => {
    const entry = displayedOverlays[i];
    if (!entry) return overlayNode;
    return React.createElement(
      OverlayContext.Provider,
      { value: entry.id, key: `ovl-ctx-${entry.id}` },
      overlayNode,
    );
  });

  return React.createElement(
    Box,
    { flexDirection: 'column', width: '100%', height: '100%' },
    currentScreen as React.ReactElement,
    ...wrappedOverlays.map((w) => w as React.ReactElement),
  );
}
