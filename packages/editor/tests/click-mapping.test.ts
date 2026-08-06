import { describe, expect, it } from "vitest";
import { clickToPosition } from "../src/view/click-mapping.js";

const RECT = { x: 1, y: 1, width: 10, height: 5 };
const GUTTER = 2; // 1-digit line numbers + 1 spacing

describe("clickToPosition", () => {
	it("maps a click in the text area to a document position", () => {
		expect(clickToPosition({ x: 5, y: 1 }, RECT, GUTTER, 0, 5)).toEqual({
			line: 0,
			visual: 2, // x=5 → localX=4 → minus 2 gutter
		});
	});

	it("snaps clicks on the line-number gutter to the left edge of the text", () => {
		expect(clickToPosition({ x: 1, y: 2 }, RECT, GUTTER, 0, 5)).toEqual({
			line: 1,
			visual: 0,
		});
	});

	it("accounts for the vertical scroll offset", () => {
		expect(clickToPosition({ x: 3, y: 3 }, RECT, GUTTER, 10, 20)).toEqual({
			line: 12, // visibleStart 10 + localY 2
			visual: 0,
		});
	});

	it("clamps rows past the last document line", () => {
		expect(clickToPosition({ x: 3, y: 5 }, RECT, GUTTER, 10, 11)).toEqual({
			line: 10, // 10 + 4 = 14 → clamp to lineCount - 1
			visual: 0,
		});
	});
});
