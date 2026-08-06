/**
 * Cursor coordinate types.
 *
 * Core of the dual-column design: editing uses `logical` (a code unit index,
 * used for slicing/splicing), while display and cross-line movement use
 * `visual` (terminal columns). Keeping them separate prevents cursor drift
 * on wide characters (CJK/emoji).
 */

/** Cursor position in the document. Internal state stores only these two; `visual` is derived. */
export type Position = {
	line: number;
	logical: number;
};

/** Exposed cursor state: `visual` is derived from the current line's prefix width. */
export type CursorState = Position & {
	visual: number;
};
