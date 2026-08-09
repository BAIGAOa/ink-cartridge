import { describe, expect, it } from "vitest";
import { clampFrame } from "../src/view/frame-clamp.js";

describe("clampFrame", () => {
	it("keeps a position fully inside the terminal unchanged", () => {
		// 46-wide frame on a 100x30 terminal: free range is left 0..54, top 0..21.
		expect(clampFrame(10, 5, 100, 30, 46, 9)).toEqual({ left: 10, top: 5 });
		expect(clampFrame(54, 21, 100, 30, 46, 9)).toEqual({ left: 54, top: 21 });
	});

	it("clamps the right/bottom border to the terminal edge", () => {
		expect(clampFrame(60, 25, 100, 30, 46, 9)).toEqual({ left: 54, top: 21 });
	});

	it("clamps negative positions to 0 so the left/top border stays visible", () => {
		expect(clampFrame(-5, -3, 100, 30, 46, 9)).toEqual({ left: 0, top: 0 });
	});

	it("keeps the frame at 0 when the terminal is smaller than the frame", () => {
		// columns - width < 0: the frame cannot fit, pin it to the origin
		// instead of letting the border leave the screen on both sides.
		expect(clampFrame(-2, 4, 40, 5, 46, 9)).toEqual({ left: 0, top: 0 });
		expect(clampFrame(10, 4, 40, 5, 46, 9)).toEqual({ left: 0, top: 0 });
	});
});
