export type ClickTarget = {
	line: number;
	visual: number;
};

/**
 * Convert a 1-based terminal click (from `useMouseRegion`) into a document
 * position, accounting for the line-number gutter and the vertical scroll
 * offset.
 *
 * Assumes the region is the editor box itself with no padding, so
 * `event.x - rect.x` is a 0-based cell column inside the region. Columns
 * left of the gutter (clicks on the line numbers) snap to the text area's
 * left edge; rows past the last document line clamp to it.
 */
export function clickToPosition(
	event: { x: number; y: number },
	rect: { x: number; y: number; width: number; height: number },
	gutterWidth: number,
	visibleStart: number,
	lineCount: number,
): ClickTarget {
	const localX = event.x - rect.x;
	const localY = event.y - rect.y;
	const visual = Math.max(0, localX - gutterWidth);
	const line = Math.max(0, Math.min(visibleStart + localY, lineCount - 1));
	return { line, visual };
}
