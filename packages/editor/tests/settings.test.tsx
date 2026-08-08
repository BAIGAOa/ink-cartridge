import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { clearRegistry, registerComponent } from "ink-cartridge";
import { MainMenu } from "../src/view/main-menu.js";
import { Settings } from "../src/view/settings.js";
import { flush, press, renderApp, stripAnsi } from "./base/_helpers.js";

function registerAll() {
	registerComponent(MainMenu, {});
	registerComponent(Settings, {}, { parent: MainMenu });
}

describe("Settings language switching", () => {
	beforeEach(() => {
		clearRegistry();
		registerAll();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("opens a language picker modal and switches to Chinese", async () => {
		const { stdin, lastFrame, unmount } = renderApp(MainMenu);
		await flush();
		await press(stdin, "s"); // open settings
		await flush();
		// The settings screen lists the entry with its current value; the
		// language options are NOT spread out yet.
		expect(stripAnsi(lastFrame())).toContain("Language");
		expect(stripAnsi(lastFrame())).toContain("English");
		expect(stripAnsi(lastFrame())).not.toContain("中文");

		await press(stdin, "\r"); // open the language picker modal
		await flush();
		expect(stripAnsi(lastFrame())).toContain("中文");

		await press(stdin, "down"); // select 中文
		await press(stdin, "\r"); // apply + close the modal
		await flush();
		await press(stdin, "\x1b"); // back to menu
		await flush();
		expect(stripAnsi(lastFrame())).toContain("编辑模式");
		expect(stripAnsi(lastFrame())).toContain("退出");
		unmount();
	});

	it("Esc cancels the language picker without changing the language", async () => {
		const { stdin, lastFrame, unmount } = renderApp(MainMenu);
		await flush();
		await press(stdin, "s"); // open settings
		await flush();
		await press(stdin, "\r"); // open the picker
		await flush();
		await press(stdin, "down"); // select 中文…
		await press(stdin, "\x1b"); // …then cancel
		await flush();
		// Back on the settings screen, still in English.
		expect(stripAnsi(lastFrame())).toContain("English");
		expect(stripAnsi(lastFrame())).not.toContain("中文");
		unmount();
	});
});
