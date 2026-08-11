import type { CursorState, Position } from "./position.js";
import { TextLine } from "./text-line.js";

export type DocumentOptions = {
	indentWidth?: number;
};

/**
 * Document model: array of lines + cursor + scroll state.
 *
 * Pure data and behavior: no React/Ink awareness, and no change
 * notifications — `EditorController` owns those. The cursor stores only
 * `{line, logical}`; `visual` is derived (see {@link CursorState}), so
 * "logical column" and "display column" cannot diverge by construction.
 *
 * The document always has at least one line (empty document = one empty
 * line), matching the result of `"".split(/\r?\n/)`.
 */
export class Document {
	private _lines: TextLine[];
	private _cursor: Position;
	private _scrollTop = 0;
	private _wrapWidth = Infinity;
	// Non-null while the user is scrolling the view manually (Ctrl+wheel):
	// updateScroll keeps this position instead of following the cursor.
	private _viewScrollTop: number | null = null;
	// Fractional view-scroll remainder, so e.g. 3.5 cells/notch scrolls 3,4,3,4…
	private _scrollRemainder = 0;
	readonly indentWidth: number;

	constructor(text: string, options: DocumentOptions = {}) {
		this._lines = text.split(/\r?\n/).map((t) => new TextLine(t));
		this._cursor = { line: 0, logical: 0 };
		this.indentWidth = options.indentWidth ?? 2;
	}

	get lineCount(): number {
		return this._lines.length;
	}

	/** Snapshot of all line texts (for rendering; internally the model is `TextLine[]`). */
	get lines(): string[] {
		return this._lines.map((l) => l.text);
	}

	getLine(i: number): string {
		return this._lines[i].text;
	}

	/**
	 * The full document text with normalized LF line endings — the inverse
	 * of the constructor's `split(/\r?\n/)`, so text → document → text is
	 * lossless. Used for saving and dirty-hash comparison.
	 */
	get text(): string {
		return this._lines.map((l) => l.text).join("\n");
	}

	/**
	 * Replace the whole content (used when opening a file). Resets the
	 * cursor and scroll state; the wrap width is view-configured and
	 * untouched. The `Document` instance stays stable, so controllers and
	 * bindings that hold it keep working.
	 */
	setText(text: string): void {
		this._lines = text.split(/\r?\n/).map((t) => new TextLine(t));
		this._cursor = { line: 0, logical: 0 };
		this._scrollTop = 0;
		this._viewScrollTop = null;
		this._scrollRemainder = 0;
	}

	get cursor(): CursorState {
		const line = this._lines[this._cursor.line];
		return {
			line: this._cursor.line,
			logical: this._cursor.logical,
			visual: line.visualAt(this._cursor.logical),
		};
	}

	get scrollTop(): number {
		return this._scrollTop;
	}

	/** Soft-wrap width in terminal cells; `Infinity` disables wrapping. */
	get wrapWidth(): number {
		return this._wrapWidth;
	}

	/** Set the soft-wrap width (clamped to at least 1 cell). */
	setWrapWidth(width: number): void {
		this._wrapWidth = Math.max(1, width);
	}

	/** The soft-wrap segments of one logical line (an empty line is one empty segment). */
	private lineSegments(line: number): Array<{
		start: number;
		end: number;
		/** Tab-expanded display text (safe to render verbatim). */
		text: string;
	}> {
		const tl = this._lines[line];
		if (tl.text.length === 0) {
			return [{ start: 0, end: 0, text: "" }];
		}
		const segs: Array<{ start: number; end: number; text: string }> = [];
		let segVisual = 0;
		let segStart = 0;
		while (segStart < tl.text.length) {
			const seg = tl.segmentFrom(segVisual, this._wrapWidth);
			segs.push({ start: segStart, end: seg.endLogical, text: seg.text });
			if (seg.text === "") {
				break;
			}
			segStart = seg.endLogical;
			segVisual = seg.endVisual;
		}
		return segs;
	}

	/** Total number of visual (soft-wrapped) lines across the document. */
	get visualLineCount(): number {
		let total = 0;
		for (let i = 0; i < this._lines.length; i++) {
			total += this.lineSegments(i).length;
		}
		return total;
	}

	/**
	 * Map a global visual line to its logical line and the segment's logical
	 * span. `first` marks the segment that starts at the logical line start
	 * (the one that carries the line number).
	 */
	visualLineAt(
		vline: number,
	): { line: number; start: number; end: number; first: boolean; text: string } | null {
		if (vline < 0) {
			return null;
		}
		let remaining = vline;
		for (let line = 0; line < this._lines.length; line++) {
			const segs = this.lineSegments(line);
			if (remaining < segs.length) {
				return {
					line,
					start: segs[remaining].start,
					end: segs[remaining].end,
					first: remaining === 0,
					text: segs[remaining].text,
				};
			}
			remaining -= segs.length;
		}
		return null;
	}

	/** Global visual line the cursor sits on. */
	get cursorVisualLine(): number {
		const { line, logical } = this._cursor;
		let v = 0;
		for (let i = 0; i < line; i++) {
			v += this.lineSegments(i).length;
		}
		const segs = this.lineSegments(line);
		let idx = 0;
		// A cursor exactly on a segment boundary belongs to the segment
		// starting there, so visual lines read like real lines: the boundary
		// column is the first cell of the next visual line.
		while (idx < segs.length - 1 && logical >= segs[idx + 1].start) {
			idx++;
		}
		return v + idx;
	}

	/** Visual offset of the cursor within its current soft-wrap segment. */
	get cursorSegmentVisual(): number {
		const tl = this._lines[this._cursor.line];
		const segs = this.lineSegments(this._cursor.line);
		const { logical } = this._cursor;
		let idx = segs.length - 1;
		while (idx > 0 && logical < segs[idx].start) {
			idx--;
		}
		return tl.visualAt(logical) - tl.visualAt(segs[idx].start);
	}

	/**
	 * The target logical column for a vertical move onto `segment` (in any
	 * line): keep the cursor's offset within its current segment, clamping to
	 * the segment end only when the target segment is narrower.
	 */
	private moveToSegment(
		segment: { line: number; start: number; end: number },
	): void {
		const offset = this.cursorSegmentVisual;
		const targetVisual =
			this.visualAtLogical(segment.line, segment.start) + offset;
		let col = this.logicalAtVisual(segment.line, targetVisual);
		col = Math.min(Math.max(col, segment.start), segment.end);
		this.setCursor(segment.line, col);
	}

	/** Gutter width = decimal digit count of the last line number (at least 1). */
	getLineNumberWidth(): number {
		return Math.max(String(this._lines.length - 1).length, 1);
	}

	setLine(i: number, text: string): void {
		this._lines[i] = new TextLine(text);
	}

	/** Insert a line at index `i` (0 <= i <= lineCount), shifting the rest down. */
	insertLineAt(i: number, text: string): void {
		this._lines.splice(i, 0, new TextLine(text));
	}

	/** Remove line `i` and return its text. */
	removeLineAt(i: number): string {
		return this._lines.splice(i, 1)[0].text;
	}

	/** Set the cursor, clamping out-of-range values (line to `[0, lineCount-1]`, column to end of line). */
	setCursor(line: number, logical: number): void {
		const l = Math.max(0, Math.min(line, this._lines.length - 1));
		const text = this._lines[l].text;
		let col = Math.max(0, Math.min(logical, text.length));
		// The cursor must never sit between the halves of a surrogate pair —
		// typing there would split the emoji — so snap it to the pair start.
		if (
			col > 0 &&
			col < text.length &&
			text.charCodeAt(col) >= 0xdc00 &&
			text.charCodeAt(col) <= 0xdfff &&
			text.charCodeAt(col - 1) >= 0xd800 &&
			text.charCodeAt(col - 1) <= 0xdbff
		) {
			col--;
		}
		this._cursor = { line: l, logical: col };
		// Any cursor movement releases the manual view-scroll lock so the
		// viewport follows the cursor again.
		this._viewScrollTop = null;
	}

	/**
	 * Set the cursor by terminal column instead of code unit index — the
	 * entry point for mouse clicks. Snaps to the nearest valid position
	 * (see {@link TextLine.logicalAt}).
	 */
	setCursorAtVisual(line: number, visual: number): void {
		const l = Math.max(0, Math.min(line, this._lines.length - 1));
		this.setCursor(l, this._lines[l].logicalAt(visual));
	}

	/** Terminal column on a logical line → nearest logical column. */
	logicalAtVisual(line: number, visual: number): number {
		return this._lines[line].logicalAt(visual);
	}

	/** Logical column → terminal column on a logical line. */
	visualAtLogical(line: number, logical: number): number {
		return this._lines[line].visualAt(logical);
	}

	moveLeft(): void {
		const { line, logical } = this._cursor;
		if (logical > 0) {
			let target = logical - 1;
			// Step over the whole emoji: stopping at its trailing half would
			// leave the cursor inside the pair.
			const ch = this._lines[line].text.charCodeAt(target);
			if (target > 0 && ch >= 0xdc00 && ch <= 0xdfff) {
				target--;
			}
			this.setCursor(line, target);
		}
	}

	moveRight(): void {
		const { line, logical } = this._cursor;
		const text = this._lines[line].text;
		if (logical < text.length) {
			let target = logical + 1;
			// Step over the whole emoji: stopping at its leading half would
			// leave the cursor inside the pair.
			const ch = text.charCodeAt(logical);
			if (target < text.length && ch >= 0xd800 && ch <= 0xdbff) {
				target++;
			}
			this.setCursor(line, target);
		}
	}

	/** Vertical movement aligns by visual column, so wide-character lines do not drift. */
	moveUp(): void {
		const { line, logical } = this._cursor;
		if (this.cursorVisualLine === 0) {
			// Already on the first visual line: still move to the start of the
			// current segment (like up-to-line-start in vim).
			const segs = this.lineSegments(line);
			let idx = 0;
			while (idx < segs.length - 1 && logical >= segs[idx + 1].start) {
				idx++;
			}
			this.setCursor(line, segs[idx].start);
			return;
		}
		const prev = this.visualLineAt(this.cursorVisualLine - 1);
		if (!prev) {
			return;
		}
		this.moveToSegment(prev);
	}

	moveDown(): void {
		if (this.cursorVisualLine >= this.visualLineCount - 1) {
			return;
		}
		const next = this.visualLineAt(this.cursorVisualLine + 1);
		if (!next) {
			return;
		}
		this.moveToSegment(next);
	}

	moveToLineStart(): void {
		this.setCursor(this._cursor.line, 0);
	}

	moveToLineEnd(): void {
		this.setCursor(this._cursor.line, this._lines[this._cursor.line].text.length);
	}

	moveToDocumentStart(): void {
		this.setCursor(0, 0);
	}

	moveToDocumentEnd(): void {
		this.setCursor(
			this._lines.length - 1,
			this._lines[this._lines.length - 1].text.length
		);
	}

	/** A word is a run of non-whitespace; jump to the next word start (stays put at end of line). */
	moveWordForward(): void {
		const { line, logical } = this._cursor;
		const text = this._lines[line].text;
		const len = text.length;
		let i = logical;
		while (i < len && /\s/.test(text[i])) {
			i++;
		}
		while (i < len && !/\s/.test(text[i])) {
			i++;
		}
		while (i < len && /\s/.test(text[i])) {
			i++;
		}
		this.setCursor(line, i);
	}

	/** A word is a run of non-whitespace; jump back to the current/previous word start. */
	moveWordBackward(): void {
		const { line, logical } = this._cursor;
		const text = this._lines[line].text;
		let i = logical;
		while (i > 0 && /\s/.test(text[i - 1])) {
			i--;
		}
		while (i > 0 && !/\s/.test(text[i - 1])) {
			i--;
		}
		this.setCursor(line, i);
	}

	/** Page up: move the cursor up by `height - 1` visual lines (one line of overlap), keeping the visual column. */
	movePageUp(height: number): void {
		// `height` may be fractional (wheel sensitivity): round to whole
		// visual lines, keeping the one-line overlap.
		const step = Math.max(1, Math.round(height) - 1);
		const target = Math.max(0, this.cursorVisualLine - step);
		const seg = this.visualLineAt(target);
		if (!seg) {
			return;
		}
		this.moveToSegment(seg);
	}

	movePageDown(height: number): void {
		const step = Math.max(1, Math.round(height) - 1);
		const target = Math.min(
			this.visualLineCount - 1,
			this.cursorVisualLine + step,
		);
		const seg = this.visualLineAt(target);
		if (!seg) {
			return;
		}
		this.moveToSegment(seg);
	}

	/**
	 * Scroll the viewport by `delta` visual lines without moving the cursor,
	 * clamped to the document range. Fractional deltas (wheel sensitivity)
	 * accumulate and round to whole visual lines over successive notches.
	 * Locks the view in place (Ctrl+wheel browsing) until the cursor moves.
	 */
	scrollView(delta: number, height: number): number {
		const total = this.visualLineCount;
		const effectiveH = height > 0 ? height : total;
		const maxScroll = Math.max(0, total - effectiveH);
		const base = this._viewScrollTop ?? this._scrollTop;
		this._scrollRemainder += delta;
		const move = Math.trunc(this._scrollRemainder);
		this._scrollRemainder -= move;
		const vs = Math.max(0, Math.min(base + move, maxScroll));
		this._viewScrollTop = vs;
		this._scrollTop = vs;
		return vs;
	}

	/**
	 * Scroll the viewport so the cursor stays visible, in visual-line terms:
	 * if the cursor's visual line is above the viewport, scroll to it; if
	 * below, scroll so it becomes the last visible line. Returns the new
	 * scrollTop (in visual lines). While the view is manually locked
	 * (`scrollView`), the position is kept instead and only clamped.
	 */
	updateScroll(height: number): number {
		const total = this.visualLineCount;
		const effectiveH = height > 0 ? height : total;
		const maxScroll = Math.max(0, total - effectiveH);
		if (this._viewScrollTop !== null) {
			const vs = Math.max(0, Math.min(this._viewScrollTop, maxScroll));
			this._viewScrollTop = vs;
			this._scrollTop = vs;
			return vs;
		}
		const vline = this.cursorVisualLine;
		let vs = this._scrollTop;
		if (vline < vs) {
			vs = vline;
		} else if (vline >= vs + effectiveH) {
			vs = vline - effectiveH + 1;
		}
		vs = Math.max(0, Math.min(vs, maxScroll));
		this._scrollTop = vs;
		return vs;
	}
}
