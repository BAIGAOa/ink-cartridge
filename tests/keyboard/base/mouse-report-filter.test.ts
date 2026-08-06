import { describe, expect, test } from "vitest";
import { MouseReportFilter } from "../../../src/keyboard/mouse-report-filter.js";

describe("MouseReportFilter", () => {
	test("swallows a complete SGR mouse report", () => {
		const filter = new MouseReportFilter();
		expect(filter.consume("[<0;20;5M")).toBe(true);
	});

	test("swallows a release report ending in lowercase m", () => {
		const filter = new MouseReportFilter();
		expect(filter.consume("[<0;20;5m")).toBe(true);
	});

	test("swallows a wheel report", () => {
		const filter = new MouseReportFilter();
		expect(filter.consume("[<64;20;5M")).toBe(true);
	});

	test("swallows a report split across stdin chunks", () => {
		const filter = new MouseReportFilter();
		expect(filter.consume("[<0;20")).toBe(true); // first chunk, no terminator yet
		expect(filter.consume(";5M")).toBe(true); // rest completes the report
		expect(filter.consume("a")).toBe(false); // filter reset, normal input passes
	});

	test("lets normal keyboard input through", () => {
		const filter = new MouseReportFilter();
		expect(filter.consume("a")).toBe(false);
		expect(filter.consume("")).toBe(false);
		expect(filter.consume("[")).toBe(false); // a lone [ typed by the user
	});

	test("recovers after a malformed sequence longer than the cap", () => {
		const filter = new MouseReportFilter();
		expect(filter.consume("[<0;20;5")).toBe(true);
		// Buffer grows past 32 chars without a terminator → force-reset.
		expect(filter.consume("x".repeat(40))).toBe(true);
		expect(filter.consume("a")).toBe(false);
	});
});
