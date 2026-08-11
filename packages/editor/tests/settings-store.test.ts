import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_SETTINGS, parseSettings } from "../src/core/settings/schema.js";
import { SettingsStore } from "../src/core/settings/store.js";

function tempDir(): string {
	return mkdtempSync(join(tmpdir(), "blots-settings-"));
}

describe("settings schema", () => {
	it("accepts valid settings", () => {
		expect(
			parseSettings({ wheel: { cursor: 2.5, view: 7 } }).wheel,
		).toEqual({ cursor: 2.5, view: 7 });
		expect(parseSettings({ language: "zh" }).language).toBe("zh");
	});

	it("rejects values outside 1..10", () => {
		expect(parseSettings({ wheel: { cursor: 0, view: 1 } })).toEqual(
			DEFAULT_SETTINGS,
		);
		expect(parseSettings({ wheel: { cursor: 1, view: 12 } })).toEqual(
			DEFAULT_SETTINGS,
		);
	});

	it("rejects non-0.5 steps", () => {
		expect(
			parseSettings({ wheel: { cursor: 1.3, view: 1 } }),
		).toEqual(DEFAULT_SETTINGS);
	});

	it("rejects missing keys", () => {
		expect(parseSettings({})).toEqual(DEFAULT_SETTINGS);
		expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
	});
});

describe("SettingsStore", () => {
	let dir = "";
	afterEach(() => {
		if (dir) {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	const file = () => join(dir, "settings.json");

	it("falls back to defaults when the file is missing", () => {
		dir = tempDir();
		const store = new SettingsStore(file());
		expect(store.settings).toEqual(DEFAULT_SETTINGS);
	});

	it("loads persisted settings", () => {
		dir = tempDir();
		writeFileSync(
			file(),
			JSON.stringify({ wheel: { cursor: 5, view: 2 } }),
			"utf8",
		);
		const store = new SettingsStore(file());
		expect(store.settings.wheel).toEqual({ cursor: 5, view: 2 });
	});

	it("falls back to defaults on corrupt JSON", () => {
		dir = tempDir();
		writeFileSync(file(), "{not json", "utf8");
		const store = new SettingsStore(file());
		expect(store.settings).toEqual(DEFAULT_SETTINGS);
	});

	it("falls back to defaults on schema-invalid content", () => {
		dir = tempDir();
		writeFileSync(file(), JSON.stringify({ wheel: { cursor: 99, view: 1 } }), "utf8");
		const store = new SettingsStore(file());
		expect(store.settings).toEqual(DEFAULT_SETTINGS);
	});

	it("persist writes JSON to disk and update does not", () => {
		dir = tempDir();
		const store = new SettingsStore(file());
		store.update({
			...DEFAULT_SETTINGS,
			language: "zh",
			wheel: { cursor: 4, view: 4 },
		});
		expect(() => readFileSync(file(), "utf8")).toThrow(); // not written yet
		store.commit();
		expect(JSON.parse(readFileSync(file(), "utf8"))).toEqual({
			language: "zh",
			wheel: { cursor: 4, view: 4 },
			fileTree: { root: "startup", customPath: "" },
		});
	});

	it("notifies subscribers on update/persist", () => {
		dir = tempDir();
		const store = new SettingsStore(file());
		let calls = 0;
		const unsub = store.subscribe(() => calls++);
		store.update({ ...DEFAULT_SETTINGS, wheel: { cursor: 2, view: 2 } });
		expect(calls).toBe(1);
		store.persist({ ...DEFAULT_SETTINGS, wheel: { cursor: 3, view: 3 } });
		expect(calls).toBe(2);
		unsub();
		store.update({ ...DEFAULT_SETTINGS, wheel: { cursor: 1, view: 1 } });
		expect(calls).toBe(2);
	});
});
