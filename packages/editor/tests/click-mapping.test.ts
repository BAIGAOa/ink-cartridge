import { describe, expect, it } from "vitest";
import { Document } from "../src/core/document/document.js";
import { clickToPosition } from "../src/utils/view/click-mapping.js";

const RECT = { x: 1, y: 1, width: 10, height: 5 };
const GUTTER = 2; // 1-digit line numbers + 1 spacing

describe("clickToPosition", () => {
	it("maps a click in the text area to a logical position", () => {
		const doc = new Document("abcdefghij");
		expect(clickToPosition({ x: 5, y: 1 }, RECT, GUTTER, 0, doc)).toEqual({
			line: 0,
			logical: 2, // x=5 → localX=4 → minus 2 gutter
		});
	});

	it("snaps clicks on the line-number gutter to the left edge of the text", () => {
		const doc = new Document("ab\ncd\nef\ngh\nij");
		expect(clickToPosition({ x: 1, y: 2 }, RECT, GUTTER, 0, doc)).toEqual({
			line: 1,
			logical: 0,
		});
	});

	it("accounts for the vertical scroll offset (visual lines)", () => {
		const doc = new Document("l0\nl1\nl2\nl3\nl4");
		expect(clickToPosition({ x: 3, y: 3 }, RECT, GUTTER, 2, doc)).toEqual({
			line: 4, // visibleStart 2 + localY 2 → visual line 4
			logical: 0,
		});
	});

	it("clamps rows past the last document line to the document end", () => {
		const doc = new Document("l0\nl1\nl2");
		expect(clickToPosition({ x: 3, y: 5 }, RECT, GUTTER, 10, doc)).toEqual({
			line: 2,
			logical: 2, // end of "l2"
		});
	});

	it("maps a click on a soft-wrapped continuation to the same logical line", () => {
		const doc = new Document("abcdefghij");
		doc.setWrapWidth(3); // visual lines: [0-3) [3-6) [6-9) [9-10]
		// Click on the second segment (visual line 1), column offset 2:
		// segment starts at logical 3, so offset 2 → logical 5.
		expect(clickToPosition({ x: 5, y: 2 }, RECT, GUTTER, 0, doc)).toEqual({
			line: 0,
			logical: 5,
		});
	});

	it("clamps a wrapped click past the segment end to the segment end", () => {
		const doc = new Document("abcdefghij");
		doc.setWrapWidth(3);
		// Third segment is [6-9); click far right (offset 8) clamps to 9.
		expect(clickToPosition({ x: 15, y: 3 }, RECT, GUTTER, 0, doc)).toEqual({
			line: 0,
			logical: 9,
		});
	});

	it("snaps a click left of the region to the segment start", () => {
		const doc = new Document("abcdefghij");
		doc.setWrapWidth(3);
		// x=0 → localX=-1 → offset 0 → start of the continuation [3-6).
		expect(clickToPosition({ x: 0, y: 2 }, RECT, GUTTER, 0, doc)).toEqual({
			line: 0,
			logical: 3,
		});
	});

	it("snaps a click inside a wide char on a wrapped continuation", () => {
		const doc = new Document("ab你cd");
		doc.setWrapWidth(3);
		// Segments: [0-2) "ab", [2-4) "你c". Column 1 of the continuation
		// lands inside 你 → snap to its start (logical 2).
		expect(clickToPosition({ x: 4, y: 2 }, RECT, GUTTER, 0, doc)).toEqual({
			line: 0,
			logical: 2,
		});
	});

	it("clicks on the gutter of a continuation snap to the segment start", () => {
		const doc = new Document("ab你cd");
		doc.setWrapWidth(3);
		expect(clickToPosition({ x: 1, y: 2 }, RECT, GUTTER, 0, doc)).toEqual({
			line: 0,
			logical: 2,
		});
	});
});
