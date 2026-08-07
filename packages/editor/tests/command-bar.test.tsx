import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { clearRegistry, registerComponent } from "ink-cartridge";
import { MainMenu } from "../src/view/main-menu.js";
import { Editor } from "../src/view/editor.js";
import { flush, press, renderApp, stripAnsi } from "./base/_helpers.js";

function registerAll() {
	registerComponent(MainMenu, {});
	registerComponent(Editor, {}, { parent: MainMenu });
}

describe("CommandBar", () => {
	beforeEach(() => {
		clearRegistry();
		registerAll();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("opens with : in normal mode and quit returns to the menu", async () => {
		const { stdin, lastFrame, unmount } = renderApp(MainMenu);
		await flush();
		await press(stdin, "e"); // enter editor
		await flush();
		await press(stdin, "\x1b"); // → normal
		await flush();
		await press(stdin, ":"); // open command bar
		await flush();
		expect(stripAnsi(lastFrame())).toContain(":");
		await press(stdin, "quit");
		await press(stdin, "\r"); // run
		await flush();
		// back on the menu
		expect(stripAnsi(lastFrame())).toContain("Edit Mode");
		unmount();
	});

	it("escape closes the command bar and stays in normal mode", async () => {
		const { stdin, lastFrame, unmount } = renderApp(MainMenu);
		await flush();
		await press(stdin, "e");
		await flush();
		await press(stdin, "\x1b");
		await flush();
		await press(stdin, ":");
		await flush();
		await press(stdin, "\x1b");
		await flush();
		expect(stripAnsi(lastFrame())).toContain("NORMAL");
		expect(stripAnsi(lastFrame())).not.toContain(":");
		unmount();
	});

	it("unknown command shows an error hint", async () => {
		const { stdin, lastFrame, unmount } = renderApp(MainMenu);
		await flush();
		await press(stdin, "e");
		await flush();
		await press(stdin, "\x1b");
		await flush();
		await press(stdin, ":");
		await flush();
		await press(stdin, "bogus");
		await press(stdin, "\r");
		await flush();
		expect(stripAnsi(lastFrame())).toContain("Unknown command");
		unmount();
	});
});
