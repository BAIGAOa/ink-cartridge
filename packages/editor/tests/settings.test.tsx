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

	it("switches the menu language to Chinese", async () => {
		const { stdin, lastFrame, unmount } = renderApp(MainMenu);
		await flush();
		await press(stdin, "s"); // open settings
		await flush();
		expect(stripAnsi(lastFrame())).toContain("Language");
		await press(stdin, "down"); // select 中文
		await press(stdin, "\r");
		await flush();
		await press(stdin, "\x1b"); // back to menu
		await flush();
		expect(stripAnsi(lastFrame())).toContain("编辑模式");
		expect(stripAnsi(lastFrame())).toContain("退出");
		unmount();
	});
});
