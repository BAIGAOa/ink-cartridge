import type { Document } from "./document.js";

/**
 * Atomic edit operations, each implementing `apply` + `invert`.
 *
 * `invert` is the symmetric counterpart: executing it right after `apply`
 * restores the document. Undo (P1) replays `invert` in reverse order, so no
 * document snapshots are needed. The convention is that `invert` runs while
 * the cursor is at the position `apply` left it at — history will restore the
 * cursor before inverting.
 */

export type EditOperation = {
	apply(doc: Document): void;
	invert(doc: Document): void;
};

/** Insert a string at the cursor; invert deletes exactly the inserted text. */
export class InsertTextOp implements EditOperation {
	constructor(private readonly text: string) {}

	apply(doc: Document): void {
		const { line, logical } = doc.cursor;
		const cur = doc.getLine(line);
		doc.setLine(line, cur.slice(0, logical) + this.text + cur.slice(logical));
		doc.setCursor(line, logical + this.text.length);
	}

	invert(doc: Document): void {
		const { line, logical } = doc.cursor;
		const cur = doc.getLine(line);
		const start = logical - this.text.length;
		doc.setLine(line, cur.slice(0, start) + cur.slice(logical));
		doc.setCursor(line, start);
	}
}

/** Backspace: delete the char before the cursor, or join with the previous line at column 0. */
export class DeleteBeforeOp implements EditOperation {
	private _deletedChar = "";
	private _joined = false;

	apply(doc: Document): void {
		const { line, logical } = doc.cursor;
		if (logical > 0) {
			const cur = doc.getLine(line);
			this._deletedChar = cur[logical - 1];
			this._joined = false;
			doc.setLine(line, cur.slice(0, logical - 1) + cur.slice(logical));
			doc.setCursor(line, logical - 1);
		} else if (line > 0) {
			const prev = doc.getLine(line - 1);
			const cur = doc.getLine(line);
			doc.setLine(line - 1, prev + cur);
			doc.removeLineAt(line);
			doc.setCursor(line - 1, prev.length);
			this._joined = true;
		}
	}

	invert(doc: Document): void {
		if (!this._joined) {
			const { line, logical } = doc.cursor;
			const cur = doc.getLine(line);
			doc.setLine(
				line,
				cur.slice(0, logical) + this._deletedChar + cur.slice(logical)
			);
			doc.setCursor(line, logical + 1);
		} else {
			// Cursor sits at the end of the merged line; split it back at that point.
			const { line, logical } = doc.cursor;
			const cur = doc.getLine(line);
			doc.setLine(line, cur.slice(0, logical));
			doc.insertLineAt(line + 1, cur.slice(logical));
			doc.setCursor(line + 1, 0);
		}
	}
}

/** Delete key: remove the char after the cursor, or join with the next line at end of line. */
export class DeleteAfterOp implements EditOperation {
	private _deletedChar = "";
	private _joined = false;

	apply(doc: Document): void {
		const { line, logical } = doc.cursor;
		const cur = doc.getLine(line);
		if (logical < cur.length) {
			this._deletedChar = cur[logical];
			this._joined = false;
			doc.setLine(line, cur.slice(0, logical) + cur.slice(logical + 1));
		} else if (line < doc.lineCount - 1) {
			const next = doc.getLine(line + 1);
			doc.setLine(line, cur + next);
			doc.removeLineAt(line + 1);
			this._joined = true;
		}
	}

	invert(doc: Document): void {
		if (!this._joined) {
			const { line, logical } = doc.cursor;
			const cur = doc.getLine(line);
			doc.setLine(
				line,
				cur.slice(0, logical) + this._deletedChar + cur.slice(logical)
			);
		} else {
			const { line, logical } = doc.cursor;
			const cur = doc.getLine(line);
			doc.setLine(line, cur.slice(0, logical));
			doc.insertLineAt(line + 1, cur.slice(logical));
		}
	}
}

/** Enter: split the current line at the cursor; invert rejoins the two lines. */
export class SplitLineOp implements EditOperation {
	apply(doc: Document): void {
		const { line, logical } = doc.cursor;
		const cur = doc.getLine(line);
		doc.setLine(line, cur.slice(0, logical));
		doc.insertLineAt(line + 1, cur.slice(logical));
		doc.setCursor(line + 1, 0);
	}

	invert(doc: Document): void {
		// Cursor is on the newly created line; the split point is its own start.
		const { line } = doc.cursor;
		const prev = doc.getLine(line - 1);
		const cur = doc.getLine(line);
		doc.setLine(line - 1, prev + cur);
		doc.removeLineAt(line);
		doc.setCursor(line - 1, prev.length);
	}
}

/**
 * Join the next line into the current one. `apply` never moves the cursor,
 * so `invert` cannot rely on the cursor position — it records the join point
 * (end of the original current line) instead.
 */
export class JoinLineOp implements EditOperation {
	private _joinAt = 0;

	apply(doc: Document): void {
		const { line } = doc.cursor;
		if (line >= doc.lineCount - 1) {
			return;
		}
		const cur = doc.getLine(line);
		const next = doc.getLine(line + 1);
		this._joinAt = cur.length;
		doc.setLine(line, cur + next);
		doc.removeLineAt(line + 1);
	}

	invert(doc: Document): void {
		const { line } = doc.cursor;
		const cur = doc.getLine(line);
		doc.setLine(line, cur.slice(0, this._joinAt));
		doc.insertLineAt(line + 1, cur.slice(this._joinAt));
	}
}

/** Indent the current line by `indentWidth` spaces, moving the cursor along. */
export class IndentOp implements EditOperation {
	apply(doc: Document): void {
		const { line, logical } = doc.cursor;
		const cur = doc.getLine(line);
		const spaces = " ".repeat(doc.indentWidth);
		doc.setLine(line, spaces + cur);
		doc.setCursor(line, logical + doc.indentWidth);
	}

	invert(doc: Document): void {
		const { line, logical } = doc.cursor;
		const cur = doc.getLine(line);
		doc.setLine(line, cur.slice(doc.indentWidth));
		doc.setCursor(line, Math.max(0, logical - doc.indentWidth));
	}
}

/** Outdent up to `indentWidth` leading spaces; invert re-adds exactly what was removed. */
export class OutdentOp implements EditOperation {
	private _removed = 0;

	apply(doc: Document): void {
		const { line, logical } = doc.cursor;
		const cur = doc.getLine(line);
		const leading = /^ */.exec(cur)?.[0].length ?? 0;
		const remove = Math.min(leading, doc.indentWidth);
		this._removed = remove;
		if (remove > 0) {
			doc.setLine(line, cur.slice(remove));
			doc.setCursor(line, Math.max(0, logical - remove));
		}
	}

	invert(doc: Document): void {
		if (this._removed === 0) {
			return;
		}
		const { line, logical } = doc.cursor;
		const cur = doc.getLine(line);
		doc.setLine(line, " ".repeat(this._removed) + cur);
		doc.setCursor(line, logical + this._removed);
	}
}
