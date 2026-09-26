import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { clearRegistry, registerComponent } from "ink-cartridge";
import { Editor } from "../src/view/page/editor.js";
import { flush, press, renderApp, stripAnsi } from "./base/_helpers.js";

/** Editor with multi-line content so cursor movement is observable. */
function EditorWithText() {
	return <Editor value={"line1\nline2\nline3"} />;
}

/** Ten lines, long enough that the column readout stays meaningful. */
function TenLines() {
	return <Editor value={Array.from({ length: 10 }, (_, i) => `line ${i} abcdef`).join("\n")} />;
}

async function enterNormalMode(stdin: { write: (data: string) => void }) {
	await press(stdin, "\x1b");
	await flush();
}

describe("Editor modes", () => {
	beforeEach(() => {
		clearRegistry();
		registerComponent(EditorWithText, {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("inserts text in insert mode", async () => {
		const { stdin, lastFrame, unmount } = renderApp(EditorWithText);
		await flush();
		await press(stdin, "x");
		await flush();
		expect(stripAnsi(lastFrame())).toContain("xline1");
		unmount();
	});

	it("escape switches to normal and typing is blocked", async () => {
		const { stdin, lastFrame, unmount } = renderApp(EditorWithText);
		await flush();
		await press(stdin, "\x1b");
		await flush();
		expect(stripAnsi(lastFrame())).toContain("NORMAL");
		await press(stdin, "xyz");
		await flush();
		expect(stripAnsi(lastFrame())).not.toContain("xyz");
		unmount();
	});

	it("normal mode moves with hjkl and arrows, and i returns to insert", async () => {
		const { stdin, lastFrame, unmount } = renderApp(EditorWithText);
		await flush();
		await press(stdin, "\x1b"); // → normal
		await flush();
		await press(stdin, "j"); // line 2
		await flush();
		expect(stripAnsi(lastFrame())).toContain("Ln 2");
		await press(stdin, "down"); // line 3
		await flush();
		expect(stripAnsi(lastFrame())).toContain("Ln 3");
		await press(stdin, "k"); // back to line 2
		await flush();
		expect(stripAnsi(lastFrame())).toContain("Ln 2");
		await press(stdin, "i"); // → insert
		await flush();
		expect(stripAnsi(lastFrame())).toContain("INSERT");
		unmount();
	});

	it("gg via the composition engine moves to the document start", async () => {
		const { stdin, lastFrame, unmount } = renderApp(EditorWithText);
		await flush();
		await press(stdin, "\x1b"); // → normal
		await flush();
		await press(stdin, "G"); // end of document
		await flush();
		expect(stripAnsi(lastFrame())).toContain("Ln 3");
		await press(stdin, "g");
		await press(stdin, "g");
		await flush();
		expect(stripAnsi(lastFrame())).toContain("Ln 1");
		unmount();
	});

	it("a count prefix moves by N lines (5j, 2k)", async () => {
		registerComponent(TenLines, {});
		const { stdin, lastFrame, unmount } = renderApp(TenLines);
		await flush();
		await enterNormalMode(stdin);
		await press(stdin, "5");
		await press(stdin, "j");
		await flush();
		// The count is swallowed, so the plain `j` binding must not add a line.
		expect(stripAnsi(lastFrame())).toContain("Ln 6");
		await press(stdin, "2");
		await press(stdin, "k");
		await flush();
		expect(stripAnsi(lastFrame())).toContain("Ln 4");
		unmount();
	});

	it("counts accumulate over digits and clamp at both ends", async () => {
		registerComponent(TenLines, {});
		const { stdin, lastFrame, unmount } = renderApp(TenLines);
		await flush();
		await enterNormalMode(stdin);
		await press(stdin, "1");
		await press(stdin, "2");
		await press(stdin, "j");
		await flush();
		expect(stripAnsi(lastFrame())).toContain("Ln 10");
		await press(stdin, "9");
		await press(stdin, "9");
		await press(stdin, "k");
		await flush();
		expect(stripAnsi(lastFrame())).toContain("Ln 1");
		unmount();
	});

	it("a bare 0 still means line-start", async () => {
		registerComponent(TenLines, {});
		const { stdin, lastFrame, unmount } = renderApp(TenLines);
		await flush();
		await enterNormalMode(stdin);
		await press(stdin, "3");
		await press(stdin, "j");
		await press(stdin, "l");
		await press(stdin, "l");
		await flush();
		expect(stripAnsi(lastFrame())).toContain("Ln 4, Col 3");
		await press(stdin, "0");
		await flush();
		expect(stripAnsi(lastFrame())).toContain("Ln 4, Col 1");
		unmount();
	});

	it("count digits stay inert in insert mode", async () => {
		registerComponent(TenLines, {});
		const { stdin, lastFrame, unmount } = renderApp(TenLines);
		await flush();
		// Still in insert mode (the default): digits must land as text, not arm
		// a count chain, so nothing moves.
		await press(stdin, "5");
		await press(stdin, "down");
		await flush();
		const frame = stripAnsi(lastFrame());
		expect(frame).toContain("5down");
		expect(frame).toContain("Ln 1");
		unmount();
	});
});
