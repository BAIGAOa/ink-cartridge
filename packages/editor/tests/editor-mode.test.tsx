import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { clearRegistry, registerComponent } from "ink-cartridge";
import { Editor } from "../src/view/editor.js";
import { flush, press, renderApp, stripAnsi } from "./base/_helpers.js";

/** Editor with multi-line content so cursor movement is observable. */
function EditorWithText() {
	return <Editor value={"line1\nline2\nline3"} />;
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
});
