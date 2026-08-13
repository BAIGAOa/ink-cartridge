import { describe, expect, it } from "vitest";
import {
	snapSensitivity,
	valueFromRatio,
	SENSITIVITY_MAX,
	SENSITIVITY_MIN,
} from "../src/view/utils/sensitivity-bar.js";

describe("sensitivity bar mapping", () => {
	it("maps the bar ratio to 0.5-step values in 1..10", () => {
		expect(valueFromRatio(0)).toBe(SENSITIVITY_MIN);
		expect(valueFromRatio(1)).toBe(SENSITIVITY_MAX);
		expect(valueFromRatio(0.5)).toBe(5.5); // round(0.5 * 17) = 9 steps
	});

	it("clamps out-of-range ratios", () => {
		expect(valueFromRatio(-1)).toBe(SENSITIVITY_MIN);
		expect(valueFromRatio(2)).toBe(SENSITIVITY_MAX);
	});

	it("snaps by 0.5 steps within bounds", () => {
		expect(snapSensitivity(3, 1)).toBe(3.5);
		expect(snapSensitivity(3, -1)).toBe(2.5);
		expect(snapSensitivity(SENSITIVITY_MAX, 1)).toBe(SENSITIVITY_MAX);
		expect(snapSensitivity(SENSITIVITY_MIN, -1)).toBe(SENSITIVITY_MIN);
	});
});
