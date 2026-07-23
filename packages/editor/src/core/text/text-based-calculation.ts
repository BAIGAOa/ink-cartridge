import stringWidth from "string-width";

export type CursorCoordinates = {
	line: number;
	column: number;
};

export type TextCalcOptions = {
	numberOfIndentationSpaces?: number;
	cursorOffset?: number;
	cursorHeightOffset?: number;
	lineNumberRightSpacing?: number;
};

type ChangeListener = () => void;

export class TextCalculation {
	private _lines: string[];
	private _cursor: CursorCoordinates;
	private _scrollTop: number;
	private _listeners: Set<ChangeListener> = new Set();

	readonly numberOfIndentationSpaces: number;
	readonly cursorOffset: number;
	readonly cursorHeightOffset: number;
	readonly lineNumberRightSpacing: number;

	constructor(text: string, options: TextCalcOptions = {}) {
		this._lines = text ? text.split(/\r?\n/) : [];
		this._cursor = { line: 0, column: 0 };
		this._scrollTop = 0;
		this.numberOfIndentationSpaces = options.numberOfIndentationSpaces ?? 2;
		this.cursorOffset = options.cursorOffset ?? 0;
		this.cursorHeightOffset = options.cursorHeightOffset ?? 2;
		this.lineNumberRightSpacing = Math.max(
			0,
			options.lineNumberRightSpacing ?? 1
		);
	}

	onChange(listener: ChangeListener): () => void {
		this._listeners.add(listener);
		return () => {
			this._listeners.delete(listener);
		};
	}

	private _notify(): void {
		this._listeners.forEach((fn) => fn());
	}

	get lines(): string[] {
		return this._lines;
	}

	get cursor(): CursorCoordinates {
		return this._cursor;
	}

	get lineCount(): number {
		return this._lines.length;
	}

	getLineNumberWidth(): number {
		return Math.max(stringWidth(String(this._lines.length - 1)), 1);
	}

	getCurrentLineText(): string {
		return this._lines[this._cursor.line] ?? "";
	}

	getCursorX(lineNumberWidth: number): number {
		const text = this.getCurrentLineText();
		const clamped = Math.max(0, Math.min(text.length, this._cursor.column));
		const visual = stringWidth(text.slice(0, clamped));
		return (
			visual + lineNumberWidth + this.lineNumberRightSpacing + this.cursorOffset
		);
	}

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

	insertChar(char: string): void {
		const { line, column } = this._cursor;
		this._lines[line] =
			this._lines[line].slice(0, column) +
			char +
			this._lines[line].slice(column);
		this._cursor = { line, column: column + char.length };
		this._notify();
	}

	newLine(): void {
		const { line, column } = this._cursor;
		const current = this._lines[line];
		this._lines[line] = current.slice(0, column);
		this._lines.splice(line + 1, 0, current.slice(column));
		this._cursor = { line: line + 1, column: 0 };
		this._notify();
	}

	moveRight(): void {
		const maxCol = this._lines[this._cursor.line]?.length ?? 0;
		this._cursor = {
			line: this._cursor.line,
			column: Math.min(this._cursor.column + 1, maxCol),
		};
		this._notify();
	}

	moveLeft(): void {
		this._cursor = {
			line: this._cursor.line,
			column: Math.max(this._cursor.column - 1, 0),
		};
		this._notify();
	}

	moveUp(): void {
		const newLine = Math.max(this._cursor.line - 1, 0);
		const maxCol = this._lines[newLine]?.length ?? 0;
		this._cursor = {
			line: newLine,
			column: Math.min(maxCol, this._cursor.column),
		};
		this._notify();
	}

	moveDown(): void {
		const newLine = Math.min(this._cursor.line + 1, this._lines.length - 1);
		const maxCol = this._lines[newLine]?.length ?? 0;
		this._cursor = {
			line: newLine,
			column: Math.min(maxCol, this._cursor.column),
		};
		this._notify();
	}

	backspace(): void {
		const { line, column } = this._cursor;
		if (column === 0 && line !== 0) {
			const prevLen = this._lines[line - 1].length;
			this._lines[line - 1] += this._lines[line];
			this._lines.splice(line, 1);
			this._cursor = { line: line - 1, column: prevLen };
		} else if (column > 0) {
			this._lines[line] =
				this._lines[line].slice(0, column - 1) +
				this._lines[line].slice(column);
			this._cursor = { line, column: column - 1 };
		}
		this._notify();
	}

	indent(): void {
		const { line } = this._cursor;
		const spaces = " ".repeat(this.numberOfIndentationSpaces);
		this._lines[line] = spaces + this._lines[line];
		this._cursor = {
			line,
			column: this._cursor.column + this.numberOfIndentationSpaces,
		};
		this._notify();
	}

	outdent(): void {
		const { line } = this._cursor;
		const current = this._lines[line];
		const leadingSpaces = current.match(/^ */)?.[0].length || 0;
		const n = this.numberOfIndentationSpaces;

		if (leadingSpaces >= n) {
			this._lines[line] = current.slice(n);
			this._cursor = {
				line,
				column: Math.max(0, this._cursor.column - n),
			};
		} else if (leadingSpaces > 0) {
			this._lines[line] = current.slice(leadingSpaces);
			this._cursor = {
				line,
				column: Math.max(0, this._cursor.column - leadingSpaces),
			};
		}
		this._notify();
	}
}
