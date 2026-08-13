/**
 * Clamp a frame's top-left corner (0-based terminal coordinates) so the
 * whole frame stays inside the terminal. `Math.max(0, ...)` on the max side
 * keeps the frame at 0 when the terminal is smaller than the frame itself —
 * a negative position would push the border off-screen on both sides.
 */
export function clampFrame(
	left: number,
	top: number,
	columns: number,
	rows: number,
	width: number,
	height: number,
): { left: number; top: number } {
	return {
		left: Math.min(Math.max(0, left), Math.max(0, columns - width)),
		top: Math.min(Math.max(0, top), Math.max(0, rows - height)),
	};
}

export function clampBarPos(
	left: number,
	top: number,
	width: number,
	height: number,
	columns: number,
	rows: number,
	fileTreeOpen: boolean,
	treeWidth: number,
): { left: number; top: number } {
	const clamped = clampFrame(left, top, columns, rows, width, height);
	const maxLeft = fileTreeOpen ? columns - treeWidth - width : columns - width;
	return {
		left: Math.min(Math.max(0, clamped.left), Math.max(0, maxLeft)),
		top: Math.max(1, clamped.top),
	};
}
