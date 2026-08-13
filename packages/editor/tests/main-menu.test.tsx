import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { clearRegistry } from "ink-cartridge";
import { registerComponent } from "ink-cartridge";
import { MainMenu } from "../src/view/page/main-menu.js";
import { Editor } from "../src/view/page/editor.js";
import { Settings } from "../src/view/page/settings.js";
import { flush, press, renderApp, stripAnsi } from "./base/_helpers.js";

function registerAll() {
	registerComponent(MainMenu, {});
	registerComponent(Editor, {}, { parent: MainMenu });
	registerComponent(Settings, {}, { parent: MainMenu });
}

describe("MainMenu", () => {
	beforeEach(() => {
		clearRegistry();
		registerAll();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders the menu buttons (default English)", async () => {
		// Logo art rendering is not asserted — its glyphs vary by terminal
		// size tier. The buttons are the stable surface.
		const { lastFrame, unmount } = renderApp(MainMenu);
		await flush();
		const frame = stripAnsi(lastFrame());
		expect(frame).toContain("Edit Mode");
		expect(frame).toContain("Settings");
		expect(frame).toContain("Quit");
		unmount();
	});

	it("press e enters the editor (status bar shows INSERT)", async () => {
		const { stdin, lastFrame, unmount } = renderApp(MainMenu);
		await flush();
		await press(stdin, "e");
		await flush();
		expect(stripAnsi(lastFrame())).toContain("INSERT");
		unmount();
	});

	it("press s enters the settings screen", async () => {
		const { stdin, lastFrame, unmount } = renderApp(MainMenu);
		await flush();
		await press(stdin, "s");
		await flush();
		expect(stripAnsi(lastFrame())).toContain("Settings");
		expect(stripAnsi(lastFrame())).toContain("Language");
		unmount();
	});

	it("press q exits the process", async () => {
		const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
		const { stdin, unmount } = renderApp(MainMenu);
		await flush();
		await press(stdin, "q");
		expect(exit).toHaveBeenCalledWith(0);
		unmount();
	});
});
