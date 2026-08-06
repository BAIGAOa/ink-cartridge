import { describe, expect, it } from "vitest";
import { Document } from "../src/core/document/document.js";
import {
	DeleteAfterOp,
	DeleteBeforeOp,
	IndentOp,
	InsertTextOp,
	JoinLineOp,
	OutdentOp,
	SplitLineOp,
} from "../src/core/document/operations.js";

describe("InsertTextOp", () => {
	it("inserts at the cursor and advances it", () => {
		const doc = new Document("ac");
		doc.setCursor(0, 1);
		new InsertTextOp("b").apply(doc);
		expect(doc.lines).toEqual(["abc"]);
		expect(doc.cursor).toEqual({ line: 0, logical: 2, visual: 2 });
	});

	it("invert removes exactly the inserted text", () => {
		const doc = new Document("你好");
		doc.setCursor(0, 1);
		const op = new InsertTextOp("世界");
		op.apply(doc);
		expect(doc.lines).toEqual(["你世界好"]);
		op.invert(doc);
		expect(doc.lines).toEqual(["你好"]);
		expect(doc.cursor).toEqual({ line: 0, logical: 1, visual: 2 });
	});
});

describe("DeleteBeforeOp (backspace)", () => {
	it("deletes the char before the cursor", () => {
		const doc = new Document("abc");
		doc.setCursor(0, 2);
		new DeleteBeforeOp().apply(doc);
		expect(doc.lines).toEqual(["ac"]);
		expect(doc.cursor).toEqual({ line: 0, logical: 1, visual: 1 });
	});

	it("joins with the previous line at column 0", () => {
		const doc = new Document("ab\ncd");
		doc.setCursor(1, 0);
		new DeleteBeforeOp().apply(doc);
		expect(doc.lines).toEqual(["abcd"]);
		expect(doc.cursor).toEqual({ line: 0, logical: 2, visual: 2 });
	});

	it("is a no-op at the very start of the document", () => {
		const doc = new Document("ab");
		new DeleteBeforeOp().apply(doc);
		expect(doc.lines).toEqual(["ab"]);
	});

	it("invert restores the deleted char", () => {
		const doc = new Document("ab");
		doc.setCursor(0, 2);
		const op = new DeleteBeforeOp();
		op.apply(doc);
		op.invert(doc);
		expect(doc.lines).toEqual(["ab"]);
		expect(doc.cursor).toEqual({ line: 0, logical: 2, visual: 2 });
	});

	it("invert restores a joined line", () => {
		const doc = new Document("ab\ncd");
		doc.setCursor(1, 0);
		const op = new DeleteBeforeOp();
		op.apply(doc);
		op.invert(doc);
		expect(doc.lines).toEqual(["ab", "cd"]);
		expect(doc.cursor).toEqual({ line: 1, logical: 0, visual: 0 });
	});
});

describe("DeleteAfterOp (delete)", () => {
	it("deletes the char after the cursor", () => {
		const doc = new Document("abc");
		doc.setCursor(0, 1);
		new DeleteAfterOp().apply(doc);
		expect(doc.lines).toEqual(["ac"]);
		expect(doc.cursor.logical).toBe(1);
	});

	it("joins with the next line at end of line", () => {
		const doc = new Document("ab\ncd");
		doc.setCursor(0, 2);
		new DeleteAfterOp().apply(doc);
		expect(doc.lines).toEqual(["abcd"]);
	});

	it("is a no-op at the very end of the document", () => {
		const doc = new Document("ab");
		doc.setCursor(0, 2);
		new DeleteAfterOp().apply(doc);
		expect(doc.lines).toEqual(["ab"]);
	});

	it("invert restores the deleted char", () => {
		const doc = new Document("abc");
		doc.setCursor(0, 1);
		const op = new DeleteAfterOp();
		op.apply(doc);
		op.invert(doc);
		expect(doc.lines).toEqual(["abc"]);
		expect(doc.cursor).toEqual({ line: 0, logical: 1, visual: 1 });
	});

	it("invert restores a joined line", () => {
		const doc = new Document("ab\ncd");
		doc.setCursor(0, 2);
		const op = new DeleteAfterOp();
		op.apply(doc);
		op.invert(doc);
		expect(doc.lines).toEqual(["ab", "cd"]);
	});
});

describe("SplitLineOp (enter)", () => {
	it("splits the line at the cursor", () => {
		const doc = new Document("ab\ncd");
		doc.setCursor(1, 1);
		new SplitLineOp().apply(doc);
		expect(doc.lines).toEqual(["ab", "c", "d"]);
		expect(doc.cursor).toEqual({ line: 2, logical: 0, visual: 0 });
	});

	it("invert rejoins the lines", () => {
		const doc = new Document("ab\ncd");
		doc.setCursor(1, 1);
		const op = new SplitLineOp();
		op.apply(doc);
		op.invert(doc);
		expect(doc.lines).toEqual(["ab", "cd"]);
		expect(doc.cursor).toEqual({ line: 1, logical: 1, visual: 1 });
	});
});

describe("JoinLineOp", () => {
	it("joins the next line into the current one", () => {
		const doc = new Document("ab\ncd");
		new JoinLineOp().apply(doc);
		expect(doc.lines).toEqual(["abcd"]);
	});

	it("is a no-op on the last line", () => {
		const doc = new Document("ab\ncd");
		doc.setCursor(1, 0);
		new JoinLineOp().apply(doc);
		expect(doc.lines).toEqual(["ab", "cd"]);
	});

	it("invert splits at the recorded join point, not the cursor", () => {
		const doc = new Document("ab\ncd");
		doc.setCursor(0, 0); // cursor far from the join point
		const op = new JoinLineOp();
		op.apply(doc);
		op.invert(doc);
		expect(doc.lines).toEqual(["ab", "cd"]);
		expect(doc.cursor).toEqual({ line: 0, logical: 0, visual: 0 });
	});
});

describe("IndentOp / OutdentOp", () => {
	it("indents by indentWidth and moves the cursor along", () => {
		const doc = new Document("ab", { indentWidth: 4 });
		doc.setCursor(0, 1);
		new IndentOp().apply(doc);
		expect(doc.lines).toEqual(["    ab"]);
		expect(doc.cursor.logical).toBe(5);
	});

	it("outdents up to indentWidth leading spaces", () => {
		const doc = new Document("  ab", { indentWidth: 4 });
		doc.setCursor(0, 2);
		new OutdentOp().apply(doc);
		expect(doc.lines).toEqual(["ab"]);
		expect(doc.cursor.logical).toBe(0);
	});

	it("outdent is a no-op without leading spaces", () => {
		const doc = new Document("ab");
		new OutdentOp().apply(doc);
		expect(doc.lines).toEqual(["ab"]);
	});

	it("invert restores the original text and cursor", () => {
		const doc = new Document("ab", { indentWidth: 4 });
		doc.setCursor(0, 1);
		const op = new IndentOp();
		op.apply(doc);
		op.invert(doc);
		expect(doc.lines).toEqual(["ab"]);
		expect(doc.cursor.logical).toBe(1);

		const doc2 = new Document("  ab", { indentWidth: 4 });
		doc2.setCursor(0, 2);
		const out = new OutdentOp();
		out.apply(doc2);
		out.invert(doc2);
		expect(doc2.lines).toEqual(["  ab"]);
		expect(doc2.cursor.logical).toBe(2);
	});
});

describe("sequences", () => {
	it("inverting a burst of inserts in reverse restores the document", () => {
		const doc = new Document("");
		const ops = [
			new InsertTextOp("a"),
			new InsertTextOp("b"),
			new InsertTextOp("你"),
		];
		for (const op of ops) {
			op.apply(doc);
		}
		expect(doc.lines).toEqual(["ab你"]);
		for (const op of ops.reverse()) {
			op.invert(doc);
		}
		expect(doc.lines).toEqual([""]);
	});

	it("type, split, type again — invert all the way back", () => {
		const doc = new Document("");
		const ops = [
			new InsertTextOp("ab"),
			new SplitLineOp(),
			new InsertTextOp("cd"),
		];
		for (const op of ops) {
			op.apply(doc);
		}
		expect(doc.lines).toEqual(["ab", "cd"]);
		for (const op of ops.reverse()) {
			op.invert(doc);
		}
		expect(doc.lines).toEqual([""]);
		expect(doc.cursor).toEqual({ line: 0, logical: 0, visual: 0 });
	});
});
