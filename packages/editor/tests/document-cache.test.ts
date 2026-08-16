import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { Document } from "../src/core/document/document.js";

/**
 * The Document caches soft-wrap segments and a visual-line index. These
 * tests cover the cache's contract: every mutation invalidates it, a
 * same-value wrap-width set does not, and rebuilt results are identical to
 * what a fresh computation would produce. One relative smoke test proves
 * repeated queries actually hit the cache (timing, not absolute thresholds,
 * so CI machine speed cannot flake it).
 */

/** 1000 lines × 80 chars at wrap 40 → 2 segments per line, 2000 visual lines. */
function bigDoc(): Document {
	const text = Array.from({ length: 1000 }, () => "0123456789".repeat(8)).join("\n");
	const doc = new Document(text);
	doc.setWrapWidth(40);
	return doc;
}

describe("Document visual index cache", () => {
	it("invalidates on setText", () => {
		const doc = new Document("abc");
		doc.setWrapWidth(2);
		expect(doc.visualLineCount).toBe(2); // [ab][c]
		doc.setText("abcdef");
		expect(doc.visualLineCount).toBe(3); // [ab][cd][ef]
	});

	it("invalidates on setLine and rebuilds matching results", () => {
		const doc = new Document("abc\ndef");
		doc.setWrapWidth(3);
		expect(doc.visualLineAt(1)).toMatchObject({ line: 1, text: "def" });
		doc.setLine(0, "abcdef"); // line 0 now wraps into two segments
		expect(doc.visualLineCount).toBe(3);
		expect(doc.visualLineAt(2)).toEqual({
			line: 1,
			start: 0,
			end: 3,
			first: true,
			text: "def",
		});
	});

	it("invalidates on insertLineAt and removeLineAt", () => {
		const doc = new Document("abc\ndef");
		doc.setWrapWidth(3);
		doc.insertLineAt(1, "ghi");
		expect(doc.visualLineCount).toBe(3);
		expect(doc.visualLineAt(1)).toMatchObject({ line: 1, text: "ghi" });
		doc.removeLineAt(0);
		expect(doc.visualLineCount).toBe(2);
		expect(doc.visualLineAt(0)).toMatchObject({ line: 0, text: "ghi" });
	});

	it("only invalidates on a changed wrap width, not on a same-value set", () => {
		const doc = new Document("abcdefghij");
		doc.setWrapWidth(3);
		expect(doc.visualLineCount).toBe(4); // [abc][def][ghi][j]
		// The view calls setWrapWidth with the measured width every render;
		// a same-value call must keep the cache (results stay correct).
		doc.setWrapWidth(3);
		expect(doc.visualLineCount).toBe(4);
		doc.setWrapWidth(5);
		expect(doc.visualLineCount).toBe(2); // [abcde][fghij]
	});

	it("keeps cursorVisualLine correct after an invalidation", () => {
		const doc = new Document("abcdef\nghijkl");
		doc.setWrapWidth(3);
		doc.setCursor(1, 4); // line 1, segment [3-6) → global visual line 3
		expect(doc.cursorVisualLine).toBe(3);
		doc.setLine(0, "a"); // line 0 shrinks to one segment, shifting line 1 up
		expect(doc.cursorVisualLine).toBe(2);
	});

	it("reproduces identical results when rebuilt with unchanged content", () => {
		const doc = bigDoc();
		doc.setCursor(500, 10);
		expect(doc.visualLineCount).toBe(2000);
		const count = doc.visualLineCount;
		const vline = doc.cursorVisualLine;
		const at = doc.visualLineAt(1234);
		// Same content set again: invalidates and rebuilds, results must not move.
		doc.setLine(123, doc.getLine(123));
		expect(doc.visualLineCount).toBe(count);
		expect(doc.cursorVisualLine).toBe(vline);
		expect(doc.visualLineAt(1234)).toEqual(at);
	});

	it("serves repeat queries from the cache (relative smoke test)", () => {
		const doc = bigDoc();
		// Warm-up: the first query builds the segment cache and the prefix.
		expect(doc.visualLineAt(doc.visualLineCount - 1)).not.toBeNull();

		// Sink for the queried values: makes the reads observable (and the
		// statements lint-clean) without asserting anything about the values.
		let sink = 0;

		// 50 render-path query rounds against the cache...
		const t0 = performance.now();
		for (let i = 0; i < 50; i++) {
			doc.visualLineAt(doc.visualLineCount - 1);
			sink += doc.cursorVisualLine;
			sink += doc.visualLineCount;
		}
		const cachedMs = performance.now() - t0;

		// ...must be a fraction of ONE full rebuild (segmenting all 1000 lines).
		doc.setWrapWidth(41);
		const t1 = performance.now();
		doc.visualLineAt(doc.visualLineCount - 1);
		sink += doc.cursorVisualLine;
		sink += doc.visualLineCount;
		const rebuildMs = performance.now() - t1;

		// Touch the sink once after timing so the reads cannot be dropped.
		expect(sink).toBeGreaterThan(0);

		expect(cachedMs).toBeLessThan(rebuildMs / 5);
	});
});
