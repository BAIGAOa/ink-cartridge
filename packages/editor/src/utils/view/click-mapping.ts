import type { Document } from "../../core/document/document.js";

export type ClickTarget = {
	line: number;
	logical: number;
};

/**
 * Convert a 1-based terminal click (from `useMouseRegion`) into a document
 * position, accounting for the line-number gutter, the vertical scroll
 * offset, and soft-wrap segments.
 *
 * Assumes the region is the editor box itself with no padding, so
 * `event.x - rect.x` is a 0-based cell column inside the region. Columns
 * left of the gutter (clicks on the line numbers) snap to the text area's
 * left edge; rows past the last document line clamp to it.
 *
 * The clicked visual line is mapped through `doc.visualLineAt`, so a click
 * on a wrapped continuation lands on the same logical line with the segment
 * offset translated back to a logical column.
 */
export function clickToPosition(
	event: { x: number; y: number },
	rect: { x: number; y: number; width: number; height: number },
	gutterWidth: number,
	visibleStart: number,
	doc: Document,
): ClickTarget {
	const localX = event.x - rect.x;
	const localY = event.y - rect.y;
	const vline = visibleStart + localY;
	const seg = doc.visualLineAt(vline);
	if (!seg) {
		const last = doc.lineCount - 1;
		return { line: last, logical: doc.getLine(last).length };
	}
	const segmentOffset = Math.max(0, localX - gutterWidth);
	const segStartVisual = doc.visualAtLogical(seg.line, seg.start);
	const col = doc.logicalAtVisual(seg.line, segStartVisual + segmentOffset);
	const logical = Math.min(Math.max(col, seg.start), seg.end);
	return { line: seg.line, logical };
}
