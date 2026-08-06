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
		const len = this._lines[l].text.length;
		this._cursor = { line: l, logical: Math.max(0, Math.min(logical, len)) };
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

	moveLeft(): void {
		const { line, logical } = this._cursor;
		if (logical > 0) {
			this.setCursor(line, logical - 1);
		}
	}

	moveRight(): void {
		const { line, logical } = this._cursor;
		if (logical < this._lines[line].text.length) {
			this.setCursor(line, logical + 1);
		}
	}

	/** Vertical movement aligns by visual column, so wide-character lines do not drift. */
	moveUp(): void {
		const { line, logical } = this._cursor;
		if (line > 0) {
			const visual = this._lines[line].visualAt(logical);
			this.setCursor(line - 1, this._lines[line - 1].logicalAt(visual));
		}
	}

	moveDown(): void {
		const { line, logical } = this._cursor;
		if (line < this._lines.length - 1) {
			const visual = this._lines[line].visualAt(logical);
			this.setCursor(line + 1, this._lines[line + 1].logicalAt(visual));
		}
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

	/** Page up: move the cursor up by `height - 1` lines (one line of overlap), keeping the visual column. */
	movePageUp(height: number): void {
		const { line, logical } = this._cursor;
		const visual = this._lines[line].visualAt(logical);
		const target = Math.max(0, line - Math.max(1, height - 1));
		this.setCursor(target, this._lines[target].logicalAt(visual));
	}

	movePageDown(height: number): void {
		const { line, logical } = this._cursor;
		const visual = this._lines[line].visualAt(logical);
		const target = Math.min(this._lines.length - 1, line + Math.max(1, height - 1));
		this.setCursor(target, this._lines[target].logicalAt(visual));
	}

	/**
	 * Scroll the viewport so the cursor stays visible: if the cursor is above
	 * the viewport, scroll to its line; if below, scroll so it becomes the
	 * last visible line. Returns the new scrollTop.
	 */
	updateScroll(height: number): number {
		const effectiveH = height > 0 ? height : this._lines.length;
		let vs = this._scrollTop;
		if (this._cursor.line < vs) {
			vs = this._cursor.line;
		} else if (this._cursor.line >= vs + effectiveH) {
			vs = this._cursor.line - effectiveH + 1;
		}
		const maxScroll = Math.max(0, this._lines.length - effectiveH);
		vs = Math.max(0, Math.min(vs, maxScroll));
		this._scrollTop = vs;
		return vs;
	}
}
