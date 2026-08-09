import { homedir } from "node:os";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_SETTINGS, parseSettings, type EditorSettings } from "./schema.js";

/**
 * JSON persistence for editor settings at `~/.config/blots-editor/settings.json`.
 *
 * A plain observable store (no React): the view layer wraps it with
 * `useSyncExternalStore`. Reads are lazy and tolerant — a missing, corrupt or
 * schema-invalid file falls back to defaults; writes are best-effort and never
 * throw into the render path.
 */
export class SettingsStore {
	private _settings: EditorSettings | null = null;
	private readonly listeners = new Set<() => void>();
	private _filePath: string | null = null;

	/** Injectable for tests; defaults to `~/.config/blots-editor/settings.json`. */
	constructor(filePath?: string) {
		this._filePath = filePath ?? null;
	}

	get filePath(): string {
		this._filePath ??= join(
			homedir(),
			".config",
			"blots-editor",
			"settings.json",
		);
		return this._filePath;
	}

	/** Current settings (lazily loaded on first access). */
	get settings(): EditorSettings {
		if (!this._settings) {
			this._settings = this.load();
		}
		return this._settings;
	}

	private load(): EditorSettings {
		try {
			const raw = JSON.parse(readFileSync(this.filePath, "utf8"));
			return parseSettings(raw);
		} catch {
			// Missing file, unreadable JSON, or an fs error — start from defaults.
			return structuredClone(DEFAULT_SETTINGS);
		}
	}

	/** Update in memory and notify subscribers; no disk write (drag in progress). */
	update(settings: EditorSettings): void {
		this._settings = settings;
		this.notify();
	}

	/** Persist to disk, update memory, and notify subscribers. */
	persist(settings: EditorSettings): void {
		this._settings = settings;
		try {
			mkdirSync(dirname(this.filePath), { recursive: true });
			writeFileSync(
				this.filePath,
				JSON.stringify(settings, null, 2) + "\n",
				"utf8",
			);
		} catch {
			// Persistence is best-effort: a read-only home dir must not crash
			// the editor or block the settings screen.
		}
		this.notify();
	}

	/** Persist whatever is currently in memory (drag end / click). */
	commit(): void {
		if (this._settings) {
			this.persist(this._settings);
		}
	}

	/**
	 * Test helper: repoint the store at a fresh file and drop cached state,
	 * so tests never touch the real `~/.config` file.
	 */
	reset(filePath: string): void {
		this._filePath = filePath;
		this._settings = null;
	}

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	/** Notify React subscribers that settings changed. */
	notify(): void {
		this.listeners.forEach((fn) => fn());
	}
}
