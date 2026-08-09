import { expect } from "vitest";
import { Document, type DocumentOptions } from "../../src/core/document/document.js";
import type { EditOperation } from "../../src/core/document/operations.js";

/** Build a document and park the cursor at (line, col). */
export function docAt(
	text: string,
	line = 0,
	col = 0,
	options?: DocumentOptions,
): Document {
	const doc = new Document(text, options);
	doc.setCursor(line, col);
	return doc;
}

/** Apply an operation to a fresh document with the given cursor position. */
export function applyAt(
	op: EditOperation,
	text: string,
	line: number,
	col: number,
	options?: DocumentOptions,
): Document {
	const doc = docAt(text, line, col, options);
	op.apply(doc);
	return doc;
}

/**
 * Assert that apply then invert restores the document text and the cursor
 * position. History replays `invert` while the cursor is where `apply` left
 * it, so the op is not re-positioned between the two phases.
 */
export function expectInvertRestores(
	op: EditOperation,
	text: string,
	line: number,
	col: number,
	options?: DocumentOptions,
): void {
	const doc = docAt(text, line, col, options);
	const before = doc.lines;
	op.apply(doc);
	op.invert(doc);
	expect(doc.lines).toEqual(before);
	expect(doc.cursor).toEqual({
		line,
		logical: col,
		visual: doc.visualAtLogical(line, col),
	});
}
