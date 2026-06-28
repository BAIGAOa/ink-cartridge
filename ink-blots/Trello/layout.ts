/**
 * Helper: compute centered absolute position for an overlay.
 *
 * @param cols  - Terminal width (from useWindowSize)
 * @param rows  - Terminal height
 * @param width - Overlay width in columns
 * @param height - Overlay height in rows
 */
export function centerOverlay(
  cols: number,
  rows: number,
  width: number,
  height: number,
): { top: number; left: number } {
  return {
    top: Math.max(0, Math.floor((rows - height) / 2)),
    left: Math.max(0, Math.floor((cols - width) / 2)),
  };
}
