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

	describe("soft wrap", () => {
		it("splits a long line into width-bounded segments", () => {
			const doc = new Document("abcdefghij");
			doc.setWrapWidth(3);
			expect(doc.visualLineCount).toBe(4);
			expect(doc.visualLineAt(0)).toEqual({ line: 0, start: 0, end: 3, first: true });
			expect(doc.visualLineAt(1)).toEqual({ line: 0, start: 3, end: 6, first: false });
			expect(doc.visualLineAt(3)).toEqual({ line: 0, start: 9, end: 10, first: false });
			expect(doc.visualLineAt(4)).toBeNull();
		});

		it("treats an empty line as a single empty visual line", () => {
			const doc = new Document("a\n\nb");
			doc.setWrapWidth(3);
			expect(doc.visualLineCount).toBe(3);
			expect(doc.visualLineAt(1)).toEqual({ line: 1, start: 0, end: 0, first: true });
		});

		it("never splits a wide character across segments", () => {
			const doc = new Document("你你你你你"); // 10 cells wide
			doc.setWrapWidth(3); // each 你 is 2 cells; 3 fits one (2), 4 fits two
			// width 3 → one 你 (2 cells) per segment, 5 segments
			expect(doc.visualLineCount).toBe(5);
			expect(doc.visualLineAt(1)).toEqual({ line: 0, start: 1, end: 2, first: false });
		});

		it("counts cursor position in visual lines", () => {
			const doc = new Document("abcdefghij");
			doc.setWrapWidth(3);
			doc.setCursor(0, 7); // segment [6-9)
			expect(doc.cursorVisualLine).toBe(2);
			expect(doc.cursorSegmentVisual).toBe(1); // 7-6
			doc.setCursor(0, 10);
			expect(doc.cursorVisualLine).toBe(3);
			expect(doc.cursorSegmentVisual).toBe(1); // last segment [9-10)
		});

		it("moves up/down across visual lines, keeping the visual column", () => {
			const doc = new Document("abcdefghij");
			doc.setWrapWidth(3);
			doc.setCursor(0, 7); // segment [6-9), offset 1 within it
			doc.moveUp();
			// segment [3-6), same offset 1 → column 4
			expect(doc.cursor).toMatchObject({ line: 0, logical: 4 });
			doc.moveUp();
			// segment [0-3), same offset 1 → column 1
			expect(doc.cursor).toMatchObject({ line: 0, logical: 1 });
			doc.moveDown();
			// back to segment [3-6), same offset 1 → column 4
			expect(doc.cursor).toMatchObject({ line: 0, logical: 4 });
		});

		it("moves past segment boundaries without stalling", () => {
			const doc = new Document("abcdefghij");
			doc.setWrapWidth(3);
			doc.setCursor(0, 8); // segment [6-9), offset 2
			doc.moveDown();
			// last segment [9-10) is only 1 wide: offset clamps to its end 10
			expect(doc.cursor).toMatchObject({ line: 0, logical: 10 });
			doc.moveUp();
			// [9-10) offset 1 → segment [6-9) offset 1 → column 7
			expect(doc.cursor).toMatchObject({ line: 0, logical: 7 });
			doc.moveUp();
			expect(doc.cursor).toMatchObject({ line: 0, logical: 4 });
			doc.moveUp();
			expect(doc.cursor).toMatchObject({ line: 0, logical: 1 });
			doc.moveUp();
			// first visual line: move to the segment start
			expect(doc.cursor).toMatchObject({ line: 0, logical: 0 });
		});

		it("moves down into the next logical line after the last segment", () => {
			const doc = new Document("abcdef\nxyz");
			doc.setWrapWidth(3);
			doc.setCursor(0, 6); // end of line 0
			// visual lines: 0:[0-3) 1:[3-6) 2: line1 [0-3)
			doc.moveDown();
			// screen col 6 on a 3-col line clamps to its end
			expect(doc.cursor).toMatchObject({ line: 1, logical: 3 });
		});

		it("pages by visual lines", () => {
			const doc = new Document(["abcdefghij", "k"].join("\n"));
			doc.setWrapWidth(3);
			doc.setCursor(0, 0);
			doc.movePageDown(3); // +2 visual lines → segment 2 [6-9), offset 0
			expect(doc.cursor).toMatchObject({ line: 0, logical: 6 });
			doc.movePageUp(3); // -2 → segment 0, offset 0 → column 0
			expect(doc.cursor).toMatchObject({ line: 0, logical: 0 });
		});

		it("scrolls by visual lines", () => {
			// 10 logical lines × 2 segments each = 20 visual lines.
			const doc = new Document(
				Array.from({ length: 10 }, (_, i) => `xx${i}`).join("\n")
			);
			doc.setWrapWidth(2);
			expect(doc.visualLineCount).toBe(20);
			doc.setCursor(9, 3); // last visual line
			expect(doc.updateScroll(5)).toBe(15);
			doc.setCursor(0, 0);
			expect(doc.updateScroll(5)).toBe(0);
		});

		it("scrollView scrolls the view without moving the cursor", () => {
			const doc = new Document(
				Array.from({ length: 10 }, (_, i) => `xx${i}`).join("\n")
			);
			doc.setWrapWidth(2);
			doc.setCursor(0, 0);
			expect(doc.scrollView(3, 5)).toBe(3);
			expect(doc.scrollTop).toBe(3);
			expect(doc.cursor).toMatchObject({ line: 0, logical: 0 });
		});

		it("scrollView clamps at the document bounds", () => {
			const doc = new Document(
				Array.from({ length: 10 }, (_, i) => `xx${i}`).join("\n")
			);
			doc.setWrapWidth(2);
			expect(doc.scrollView(999, 5)).toBe(15); // 20 - 5
			expect(doc.scrollView(-999, 5)).toBe(0);
		});

		it("manual view scroll stays put until the cursor moves", () => {
			const doc = new Document(
				Array.from({ length: 10 }, (_, i) => `xx${i}`).join("\n")
			);
			doc.setWrapWidth(2);
			doc.setCursor(0, 0);
			doc.scrollView(8, 5);
			// Cursor is still at the top, but updateScroll keeps the locked view.
			expect(doc.updateScroll(5)).toBe(8);
			// Moving the cursor releases the lock and the view follows again.
			doc.moveDown();
			expect(doc.updateScroll(5)).toBe(doc.cursorVisualLine);
		});

		it("keeps logical-line behavior when wrapping is off", () => {
			const doc = new Document("abcdef");
			// default wrapWidth = Infinity → one visual line per logical line
			expect(doc.visualLineCount).toBe(1);
			expect(doc.visualLineAt(0)).toEqual({ line: 0, start: 0, end: 6, first: true });
		});
	});
});
