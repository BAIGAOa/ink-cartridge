import { describe, expect, it } from "vitest";
import { Document } from "../src/core/document/document.js";

describe("Document", () => {
	describe("construction", () => {
		it("starts with a single empty line for an empty document", () => {
			const doc = new Document("");
			expect(doc.lineCount).toBe(1);
			expect(doc.lines).toEqual([""]);
			expect(doc.cursor).toEqual({ line: 0, logical: 0, visual: 0 });
		});

		it("splits on \\r\\n and \\n", () => {
			const doc = new Document("a\r\nb\nc");
			expect(doc.lines).toEqual(["a", "b", "c"]);
		});

		it("keeps a trailing empty line for a trailing newline", () => {
			const doc = new Document("a\n");
			expect(doc.lines).toEqual(["a", ""]);
		});

		it("defaults indentWidth to 2 and honors the option", () => {
			expect(new Document("x").indentWidth).toBe(2);
			expect(new Document("x", { indentWidth: 4 }).indentWidth).toBe(4);
		});
	});

	describe("cursor", () => {
		it("derives the visual column from string width", () => {
			// 你(2) 好(2) a(1) → logical 3 sits at terminal column 5
			const doc = new Document("你好a");
			doc.setCursor(0, 3);
			expect(doc.cursor.visual).toBe(5);
		});

		it("clamps out-of-range values", () => {
			const doc = new Document("ab");
			doc.setCursor(99, 99);
			expect(doc.cursor).toEqual({ line: 0, logical: 2, visual: 2 });
			doc.setCursor(0, -1);
			expect(doc.cursor.logical).toBe(0);
		});

		it("setCursorAtVisual snaps to the nearest valid position", () => {
			const doc = new Document("你好a");
			// visual 1 lands inside 你 (2 wide) → snap left to its start
			doc.setCursorAtVisual(0, 1);
			expect(doc.cursor).toEqual({ line: 0, logical: 0, visual: 0 });
			// end of line
			doc.setCursorAtVisual(0, 5);
			expect(doc.cursor).toEqual({ line: 0, logical: 3, visual: 5 });
			// beyond the line clamps to its end
			doc.setCursorAtVisual(0, 999);
			expect(doc.cursor.logical).toBe(3);
			// out-of-range line clamps
			doc.setCursorAtVisual(99, 0);
			expect(doc.cursor.line).toBe(0);
		});
	});

	describe("horizontal movement", () => {
		it("stays put at line boundaries", () => {
			const doc = new Document("ab");
			doc.moveLeft();
			expect(doc.cursor.logical).toBe(0);
			doc.moveRight();
			doc.moveRight();
			expect(doc.cursor.logical).toBe(2);
		});

		it("word movement skips whitespace runs", () => {
			const doc = new Document("hello  world");
			doc.setCursor(0, 0);
			doc.moveWordForward();
			expect(doc.cursor.logical).toBe(7);
			doc.moveWordBackward();
			expect(doc.cursor.logical).toBe(0);
		});

		it("word forward stops at end of line", () => {
			const doc = new Document("hello");
			doc.moveWordForward();
			expect(doc.cursor.logical).toBe(5);
		});

		it("line start/end and document start/end", () => {
			const doc = new Document("ab\ncd");
			doc.setCursor(1, 1);
			doc.moveToLineStart();
			expect(doc.cursor.logical).toBe(0);
			doc.moveToLineEnd();
			expect(doc.cursor.logical).toBe(2);
			doc.moveToDocumentStart();
			expect(doc.cursor).toEqual({ line: 0, logical: 0, visual: 0 });
			doc.moveToDocumentEnd();
			expect(doc.cursor).toEqual({ line: 1, logical: 2, visual: 2 });
		});
	});

	describe("vertical movement", () => {
		it("keeps the visual column when moving into a shorter line", () => {
			const doc = new Document("ab\n你好a");
			doc.setCursor(1, 3); // visual 5
			doc.moveUp();
			expect(doc.cursor).toEqual({ line: 0, logical: 2, visual: 2 });
		});

		it("snaps left when the target column lands inside a wide char", () => {
			const doc = new Document("ab\n你好a");
			doc.setCursor(0, 1); // visual 1
			doc.moveDown();
			// 你 is 2 wide, so visual 1 lands inside it → snap to its start
			expect(doc.cursor).toEqual({ line: 1, logical: 0, visual: 0 });
		});

		it("stays put at the first/last line", () => {
			const doc = new Document("a\nb");
			doc.moveUp();
			expect(doc.cursor.line).toBe(0);
			doc.setCursor(1, 0);
			doc.moveDown();
			expect(doc.cursor.line).toBe(1);
		});

		it("pages up/down keeping the visual column", () => {
			const doc = new Document(["a", "b", "c", "d", "e", "f"].join("\n"));
			doc.setCursor(5, 0);
			doc.movePageUp(3);
			expect(doc.cursor.line).toBe(3);
			doc.movePageDown(3);
			expect(doc.cursor.line).toBe(5);
		});
	});

	describe("scrolling", () => {
		it("scrolls down when the cursor exits the viewport bottom", () => {
			const doc = new Document(["a", "b", "c", "d"].join("\n"));
			doc.setCursor(3, 0);
			expect(doc.updateScroll(2)).toBe(2);
			expect(doc.scrollTop).toBe(2);
		});

		it("scrolls back up when the cursor exits the viewport top", () => {
			const doc = new Document(["a", "b", "c", "d"].join("\n"));
			doc.setCursor(3, 0);
			doc.updateScroll(2);
			doc.setCursor(0, 0);
			expect(doc.updateScroll(2)).toBe(0);
		});

		it("does not scroll when the viewport fits the document", () => {
			const doc = new Document(["a", "b"].join("\n"));
			doc.setCursor(1, 0);
			expect(doc.updateScroll(5)).toBe(0);
		});
	});

	describe("line number gutter", () => {
		it("grows with the line count", () => {
			expect(new Document("").getLineNumberWidth()).toBe(1);
			const doc = new Document(
				Array.from({ length: 11 }, (_, i) => `line${i}`).join("\n")
			);
			expect(doc.getLineNumberWidth()).toBe(2);
		});
	});
});
