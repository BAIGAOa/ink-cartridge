import { describe, expect, it } from "vitest";
import { expandTabs, TextLine } from "../src/core/document/text-line.js";

describe("TextLine", () => {
	describe("width", () => {
		it("sums the terminal widths of mixed-width text", () => {
			expect(new TextLine("a你b").width).toBe(4);
			expect(new TextLine("").width).toBe(0);
		});

		it("counts a surrogate pair as one glyph of width 2", () => {
			expect(new TextLine("👋").width).toBe(2);
			expect(new TextLine("👋a").width).toBe(3);
		});
	});

	describe("visualAt", () => {
		it("clamps out-of-range logical indices", () => {
			const tl = new TextLine("ab");
			expect(tl.visualAt(-5)).toBe(0);
			expect(tl.visualAt(99)).toBe(2);
		});

		it("shares one prefix value across the two halves of a surrogate pair", () => {
			const tl = new TextLine("👋");
			expect(tl.visualAt(0)).toBe(0);
			expect(tl.visualAt(1)).toBe(2);
			expect(tl.visualAt(2)).toBe(2);
		});

		it("maps wide characters to their cumulative widths", () => {
			const tl = new TextLine("你a");
			expect(tl.visualAt(0)).toBe(0);
			expect(tl.visualAt(1)).toBe(2);
			expect(tl.visualAt(2)).toBe(3);
		});
	});

	describe("logicalAt", () => {
		it("snaps left when the target column lands inside a wide char", () => {
			const tl = new TextLine("你a");
			expect(tl.logicalAt(1)).toBe(0);
			expect(tl.logicalAt(2)).toBe(1);
			expect(tl.logicalAt(3)).toBe(2);
		});

		it("returns 0 for non-positive columns", () => {
			const tl = new TextLine("ab");
			expect(tl.logicalAt(0)).toBe(0);
			expect(tl.logicalAt(-1)).toBe(0);
		});

		it("clamps beyond the line end to the last index", () => {
			const tl = new TextLine("ab");
			expect(tl.logicalAt(99)).toBe(2);
		});
	});

	describe("segmentFrom", () => {
		it("cuts the longest segment that fits the wrap width", () => {
			const tl = new TextLine("abcdef");
			expect(tl.segmentFrom(0, 4)).toEqual({
				text: "abcd",
				endVisual: 4,
				endLogical: 4,
			});
		});

		it("chains segments from the previous end position", () => {
			const tl = new TextLine("abcdefgh");
			const s1 = tl.segmentFrom(0, 3);
			const s2 = tl.segmentFrom(s1.endVisual, 3);
			expect(s1).toEqual({ text: "abc", endVisual: 3, endLogical: 3 });
			expect(s2).toEqual({ text: "def", endVisual: 6, endLogical: 6 });
		});

		it("never splits a wide character across segments", () => {
			const tl = new TextLine("你你");
			expect(tl.segmentFrom(0, 3)).toEqual({
				text: "你",
				endVisual: 2,
				endLogical: 1,
			});
		});

		it("takes a single wide char even when it exceeds the wrap width", () => {
			const tl = new TextLine("你");
			expect(tl.segmentFrom(0, 1)).toEqual({
				text: "你",
				endVisual: 2,
				endLogical: 1,
			});
		});

		it("treats a surrogate pair as one unit under a tiny wrap width", () => {
			const tl = new TextLine("👋a");
			expect(tl.segmentFrom(0, 1)).toEqual({
				text: "👋",
				endVisual: 2,
				endLogical: 2,
			});
		});

		it("returns an empty tail segment when starting past the line end", () => {
			const tl = new TextLine("ab");
			expect(tl.segmentFrom(2, 3)).toEqual({
				text: "",
				endVisual: 2,
				endLogical: 2,
			});
		});
	});
});

describe("tabs", () => {
	it("counts a tab as jumping to the next tab stop (column-relative)", () => {
		expect(new TextLine("\t").width).toBe(4);
		expect(new TextLine("a\t").width).toBe(4);
		expect(new TextLine("abc\t").width).toBe(4);
		expect(new TextLine("abcd\t").width).toBe(8);
	});

	it("maps visual columns across tabs", () => {
		const tl = new TextLine("a\tb");
		expect(tl.visualAt(2)).toBe(4); // logical 2 = the tab's code unit
		expect(tl.visualAt(3)).toBe(5);
		expect(tl.logicalAt(4)).toBe(2);
		expect(tl.logicalAt(0)).toBe(0);
	});

	it("expands tabs to spaces aligned to the tab stops", () => {
		expect(expandTabs("\t")).toBe("    ");
		expect(expandTabs("a\tb")).toBe("a   b");
		expect(expandTabs("abcd\tx")).toBe("abcd    x");
		// Expansion is column-aware when starting mid-line (wrap segment).
		expect(expandTabs("\tx", 2)).toBe("  x");
	});

	it("soft-wrap segments carry tab-expanded text", () => {
		const tl = new TextLine("ab\tcd");
		const seg = tl.segmentFrom(0, 4);
		expect(seg.text).toBe("ab  ");
		expect(seg.endVisual).toBe(4);
	});
});
