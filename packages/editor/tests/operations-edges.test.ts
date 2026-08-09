import { describe, expect, it } from "vitest";
import {
	DeleteAfterOp,
	DeleteBeforeOp,
	IndentOp,
	InsertTextOp,
	JoinLineOp,
	OutdentOp,
	SplitLineOp,
} from "../src/core/document/operations.js";
import { applyAt, docAt, expectInvertRestores } from "./base/_logic-helpers.js";

describe("InsertTextOp edge cases", () => {
	it("empty text is a no-op", () => {
		const doc = applyAt(new InsertTextOp(""), "ab", 0, 1);
		expect(doc.lines).toEqual(["ab"]);
		expect(doc.cursor.logical).toBe(1);
	});

	it("inserts at the end of the document", () => {
		const doc = applyAt(new InsertTextOp("!"), "ab", 0, 2);
		expect(doc.lines).toEqual(["ab!"]);
	});

	it("round-trips through a wide-character line", () => {
		expectInvertRestores(new InsertTextOp("世界"), "你a", 0, 1);
	});

	it("typing next to an emoji never splits the pair", () => {
		const doc = docAt("👋", 0, 0);
		doc.moveRight(); // one step lands past the emoji
		new InsertTextOp("x").apply(doc);
		expect(doc.lines).toEqual(["👋x"]);
		expect(doc.cursor.logical).toBe(3);
	});
});

describe("DeleteBeforeOp edge cases", () => {
	it("joins an empty middle line with the previous line", () => {
		const doc = applyAt(new DeleteBeforeOp(), "a\n\nb", 1, 0);
		expect(doc.lines).toEqual(["a", "b"]);
		expect(doc.cursor).toMatchObject({ line: 0, logical: 1 });
	});

	it("deletes a whole emoji at the cursor", () => {
		const doc = applyAt(new DeleteBeforeOp(), "a👋b", 0, 3);
		expect(doc.lines).toEqual(["ab"]);
		expect(doc.cursor.logical).toBe(1);
	});

	it("round-trips a delete across an emoji", () => {
		expectInvertRestores(new DeleteBeforeOp(), "a👋b", 0, 3);
	});
});

describe("DeleteAfterOp edge cases", () => {
	it("joins an empty middle line with the next line", () => {
		const doc = applyAt(new DeleteAfterOp(), "a\n\nb", 1, 0);
		expect(doc.lines).toEqual(["a", "b"]);
	});

	it("deletes a whole emoji at the cursor", () => {
		const doc = applyAt(new DeleteAfterOp(), "a👋b", 0, 1);
		expect(doc.lines).toEqual(["ab"]);
		expect(doc.cursor.logical).toBe(1);
	});

	it("round-trips a delete across an emoji", () => {
		expectInvertRestores(new DeleteAfterOp(), "a👋b", 0, 1);
	});
});

describe("SplitLineOp edge cases", () => {
	it("splits at the line start, creating an empty first half", () => {
		const doc = applyAt(new SplitLineOp(), "ab\ncd", 0, 0);
		expect(doc.lines).toEqual(["", "ab", "cd"]);
		expect(doc.cursor).toMatchObject({ line: 1, logical: 0 });
	});

	it("splits at the line end, creating an empty second half", () => {
		const doc = applyAt(new SplitLineOp(), "ab\ncd", 1, 2);
		expect(doc.lines).toEqual(["ab", "cd", ""]);
	});

	it("splits the last line", () => {
		const doc = applyAt(new SplitLineOp(), "ab", 0, 1);
		expect(doc.lines).toEqual(["a", "b"]);
	});

	it("round-trips from mid-line", () => {
		expectInvertRestores(new SplitLineOp(), "ab\ncd", 1, 1);
	});
});

describe("JoinLineOp edge cases", () => {
	it("joins an empty middle line into the previous one", () => {
		const doc = applyAt(new JoinLineOp(), "a\n\nb", 1, 0);
		expect(doc.lines).toEqual(["a", "b"]);
	});

	it("joins two empty lines into one", () => {
		const doc = applyAt(new JoinLineOp(), "\n", 0, 0);
		expect(doc.lines).toEqual([""]);
	});

	it("round-trips without moving the cursor", () => {
		expectInvertRestores(new JoinLineOp(), "ab\ncd", 0, 0);
	});
});

describe("IndentOp / OutdentOp edge cases", () => {
	it("indents an empty line", () => {
		const doc = applyAt(new IndentOp(), "", 0, 0, { indentWidth: 4 });
		expect(doc.lines).toEqual(["    "]);
	});

	it("outdent removes fewer spaces than indentWidth when fewer lead", () => {
		const doc = applyAt(new OutdentOp(), " ab", 0, 1, { indentWidth: 4 });
		expect(doc.lines).toEqual(["ab"]);
		expect(doc.cursor.logical).toBe(0);
	});

	it("round-trips a partial outdent", () => {
		expectInvertRestores(new OutdentOp(), " ab", 0, 1, { indentWidth: 4 });
	});

	it("round-trips an indent on a wide-character line", () => {
		expectInvertRestores(new IndentOp(), "你", 0, 1, { indentWidth: 2 });
	});
});
