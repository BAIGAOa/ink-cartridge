import { describe, expect, it } from "vitest";
import { Document } from "../src/core/document/document.js";
import { docAt } from "./base/_logic-helpers.js";

describe("Document edge cases", () => {
	describe("line mutation", () => {
		it("setLine replaces a line and getLine reads it back", () => {
			const doc = new Document("a\nb");
			doc.setLine(1, "zz");
			expect(doc.getLine(1)).toBe("zz");
			expect(doc.lines).toEqual(["a", "zz"]);
		});

		it("insertLineAt shifts the following lines down", () => {
			const doc = new Document("a\nc");
			doc.insertLineAt(1, "b");
			expect(doc.lines).toEqual(["a", "b", "c"]);
		});

		it("insertLineAt appends at the document end", () => {
			const doc = new Document("a");
			doc.insertLineAt(1, "b");
			expect(doc.lines).toEqual(["a", "b"]);
		});

		it("removeLineAt returns the removed text", () => {
			const doc = new Document("a\nb\nc");
			expect(doc.removeLineAt(1)).toBe("b");
			expect(doc.lines).toEqual(["a", "c"]);
		});

		it("lines returns a snapshot, not a live view", () => {
			const doc = new Document("a\nb");
			const lines = doc.lines;
			lines[0] = "zzz";
			expect(doc.getLine(0)).toBe("a");
		});
	});

	describe("word movement edge cases", () => {
		it("word forward skips leading whitespace", () => {
			const doc = docAt("  hello", 0, 0);
			doc.moveWordForward();
			expect(doc.cursor.logical).toBe(7);
		});

		it("word backward from mid-word stops at the word start", () => {
			const doc = docAt("hello world", 0, 8);
			doc.moveWordBackward();
			expect(doc.cursor.logical).toBe(6);
		});

		it("word backward from a space jumps to the previous word start", () => {
			const doc = docAt("hello world", 0, 6);
			doc.moveWordBackward();
			expect(doc.cursor.logical).toBe(0);
		});

		it("word forward from mid-word lands on the next word start", () => {
			const doc = docAt("hello world foo", 0, 2);
			doc.moveWordForward();
			expect(doc.cursor.logical).toBe(6);
		});

		it("stays put on an all-whitespace line", () => {
			const doc = docAt("   ", 0, 0);
			doc.moveWordForward();
			expect(doc.cursor.logical).toBe(3);
			doc.moveWordBackward();
			expect(doc.cursor.logical).toBe(0);
		});

		it("treats punctuation as part of a word", () => {
			const doc = docAt("foo.bar", 0, 0);
			doc.moveWordForward();
			expect(doc.cursor.logical).toBe(7);
		});

		it("word movement on an empty line stays at zero", () => {
			const doc = docAt("", 0, 0);
			doc.moveWordForward();
			expect(doc.cursor.logical).toBe(0);
			doc.moveWordBackward();
			expect(doc.cursor.logical).toBe(0);
		});
	});

	describe("cursor over surrogate pairs", () => {
		it("moveRight crosses an emoji in one step", () => {
			const doc = docAt("👋a", 0, 0);
			doc.moveRight();
			expect(doc.cursor).toEqual({ line: 0, logical: 2, visual: 2 });
			doc.moveRight();
			expect(doc.cursor).toEqual({ line: 0, logical: 3, visual: 3 });
		});

		it("moveLeft crosses an emoji in one step back", () => {
			const doc = docAt("a👋", 0, 3);
			doc.moveLeft();
			expect(doc.cursor).toEqual({ line: 0, logical: 1, visual: 1 });
			doc.moveLeft();
			expect(doc.cursor).toEqual({ line: 0, logical: 0, visual: 0 });
		});

		it("setCursor snaps a middle-of-pair target to the pair start", () => {
			const doc = new Document("👋a");
			doc.setCursor(0, 1);
			expect(doc.cursor).toEqual({ line: 0, logical: 0, visual: 0 });
			// The end of the pair is a valid position and stays untouched.
			doc.setCursor(0, 2);
			expect(doc.cursor).toEqual({ line: 0, logical: 2, visual: 2 });
		});

		it("setCursorAtVisual snaps inside the pair to its start", () => {
			const doc = new Document("👋a");
			doc.setCursorAtVisual(0, 1);
			expect(doc.cursor).toEqual({ line: 0, logical: 0, visual: 0 });
		});

		it("vertical moves never land inside an emoji", () => {
			// Column 1 falls inside the pair → snaps to the pair start.
			const doc = new Document("ab\n👋b");
			doc.setCursor(0, 1);
			doc.moveDown();
			expect(doc.cursor).toEqual({ line: 1, logical: 0, visual: 0 });
			// Column 2 sits exactly on the pair → snaps left of it.
			const doc2 = new Document("ab\na👋b");
			doc2.setCursor(0, 2);
			doc2.moveDown();
			expect(doc2.cursor).toEqual({ line: 1, logical: 1, visual: 1 });
		});

		it("vertical moves away from an emoji keep the visual column", () => {
			const doc = new Document("👋b\nab");
			doc.setCursor(0, 2); // just past the emoji, visual 2
			doc.moveDown();
			expect(doc.cursor).toEqual({ line: 1, logical: 2, visual: 2 });
		});
	});

	describe("soft-wrap cursor placement", () => {
		it("setCursorAtVisual maps a terminal column inside a wrapped line", () => {
			const doc = new Document("abcdefghij");
			doc.setWrapWidth(3);
			// Second segment [3-6): terminal column 4 is offset 1 → logical 4.
			doc.setCursorAtVisual(0, 4);
			expect(doc.cursor.logical).toBe(4);
		});

		it("a cursor exactly on a segment boundary belongs to the next visual line", () => {
			const doc = new Document("abcdefghij");
			doc.setWrapWidth(3);
			doc.setCursor(0, 3);
			expect(doc.cursorVisualLine).toBe(1);
		});
	});

	describe("scrolling edge cases", () => {
		it("scrollView with a zero height clamps to no scroll", () => {
			const doc = new Document("a\nb\nc");
			expect(doc.scrollView(5, 0)).toBe(0);
		});

		it("updateScroll with a zero height never scrolls", () => {
			const doc = new Document("a\nb\nc\nd");
			doc.setCursor(3, 0);
			expect(doc.updateScroll(0)).toBe(0);
		});

		it("any cursor move releases the manual view lock", () => {
			const doc = new Document(["a", "b", "c", "d", "e", "f"].join("\n"));
			doc.setCursor(0, 0);
			doc.scrollView(2, 3);
			expect(doc.updateScroll(3)).toBe(2);
			doc.setCursor(0, 0);
			expect(doc.updateScroll(3)).toBe(0);
		});
	});

	describe("page movement edge cases", () => {
		it("page down/up with height 1 moves one line", () => {
			const doc = new Document("a\nb\nc\nd");
			doc.setCursor(0, 0);
			doc.movePageDown(1);
			expect(doc.cursor.line).toBe(1);
			doc.movePageUp(1);
			expect(doc.cursor.line).toBe(0);
		});

		it("page down at the document end stays put", () => {
			const doc = new Document("a\nb");
			doc.setCursor(1, 0);
			doc.movePageDown(3);
			expect(doc.cursor.line).toBe(1);
		});
	});
});
