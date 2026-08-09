import { describe, expect, it, vi } from "vitest";
import { EditorController } from "../src/core/editor-controller.js";

describe("EditorController", () => {
	describe("builtin edit commands", () => {
		it("editor.insertText inserts at the cursor", () => {
			const ctl = new EditorController("ac");
			ctl.document.setCursor(0, 1);
			ctl.execute("editor.insertText", { text: "b" });
			expect(ctl.document.lines).toEqual(["abc"]);
			expect(ctl.document.cursor.logical).toBe(2);
		});

		it("splitLine and joinLine restructure lines", () => {
			const ctl = new EditorController("ab\ncd");
			ctl.document.setCursor(1, 1);
			ctl.execute("editor.splitLine");
			expect(ctl.document.lines).toEqual(["ab", "c", "d"]);
			// joinLine merges the next line into the cursor's line.
			ctl.document.setCursor(1, 0);
			ctl.execute("editor.joinLine");
			expect(ctl.document.lines).toEqual(["ab", "cd"]);
		});

		it("indent and outdent honor the configured indentWidth", () => {
			const ctl = new EditorController("ab", { indentWidth: 4 });
			ctl.document.setCursor(0, 1);
			ctl.execute("editor.indent");
			expect(ctl.document.lines).toEqual(["    ab"]);
			ctl.execute("editor.outdent");
			expect(ctl.document.lines).toEqual(["ab"]);
		});

		it("deleteBefore and deleteAfter edit the current line", () => {
			const ctl = new EditorController("abc");
			ctl.document.setCursor(0, 2);
			ctl.execute("editor.deleteBefore");
			expect(ctl.document.lines).toEqual(["ac"]);
			ctl.execute("editor.deleteAfter");
			expect(ctl.document.lines).toEqual(["a"]);
		});
	});

	describe("builtin cursor commands", () => {
		it("routes movement commands to the document", () => {
			const ctl = new EditorController("hello world\nnext");
			ctl.execute("cursor.wordForward");
			expect(ctl.document.cursor.logical).toBe(6);
			// From a word start, wordBackward jumps to the previous word start.
			ctl.execute("cursor.wordBackward");
			expect(ctl.document.cursor.logical).toBe(0);
			ctl.execute("cursor.lineEnd");
			expect(ctl.document.cursor.logical).toBe(11);
			ctl.execute("cursor.documentEnd");
			expect(ctl.document.cursor).toMatchObject({ line: 1, logical: 4 });
			ctl.execute("cursor.documentStart");
			expect(ctl.document.cursor).toMatchObject({ line: 0, logical: 0 });
		});

		it("page commands honor the height arg", () => {
			const ctl = new EditorController(["a", "b", "c", "d"].join("\n"));
			ctl.document.setCursor(3, 0);
			ctl.execute("cursor.pageUp", { height: 3 });
			expect(ctl.document.cursor.line).toBe(1);
			ctl.execute("cursor.pageDown", { height: 3 });
			expect(ctl.document.cursor.line).toBe(3);
		});

		it("setPosition with a logical column sets exactly", () => {
			const ctl = new EditorController("ab");
			ctl.execute("cursor.setPosition", { line: 0, logical: 2 });
			expect(ctl.document.cursor.logical).toBe(2);
		});

		it("setPosition with a visual column snaps to a valid position", () => {
			const ctl = new EditorController("你好a");
			ctl.execute("cursor.setPosition", { line: 0, visual: 1 });
			expect(ctl.document.cursor.logical).toBe(0);
		});

		it("setPosition with a middle-of-pair logical snaps to the pair start", () => {
			const ctl = new EditorController("👋a");
			ctl.execute("cursor.setPosition", { line: 0, logical: 1 });
			expect(ctl.document.cursor).toEqual({ line: 0, logical: 0, visual: 0 });
		});
	});

	describe("view.scroll", () => {
		it("scrolls the view without moving the cursor", () => {
			const ctl = new EditorController(["a", "b", "c", "d", "e"].join("\n"));
			ctl.document.setCursor(0, 0);
			ctl.execute("view.scroll", { delta: 2, height: 2 });
			expect(ctl.document.scrollTop).toBe(2);
			expect(ctl.document.cursor.line).toBe(0);
		});

		it("defaults delta and height to zero and one", () => {
			const ctl = new EditorController(["a", "b", "c"].join("\n"));
			ctl.execute("view.scroll");
			expect(ctl.document.scrollTop).toBe(0);
		});
	});

	describe("command registry", () => {
		it("throws an [ink-cartridge] prefixed error for unknown commands", () => {
			const ctl = new EditorController("");
			expect(() => ctl.execute("nope")).toThrow("[ink-cartridge]");
		});

		it("insertText ignores non-string text", () => {
			const ctl = new EditorController("ab");
			ctl.document.setCursor(0, 1);
			ctl.execute("editor.insertText", { text: 42 });
			expect(ctl.document.lines).toEqual(["ab"]);
		});

		it("defineCommand registers a custom command", () => {
			const ctl = new EditorController("b");
			ctl.defineCommand("test.prepend", (doc, args) => {
				const text = typeof args?.text === "string" ? args.text : "";
				doc.setLine(0, text + doc.getLine(0));
			});
			ctl.execute("test.prepend", { text: "a" });
			expect(ctl.document.lines).toEqual(["ab"]);
		});

		it("defineCommand overrides an existing builtin", () => {
			const ctl = new EditorController("a");
			ctl.defineCommand("editor.insertText", (doc) => {
				doc.setLine(0, "z" + doc.getLine(0));
			});
			ctl.execute("editor.insertText", { text: "x" });
			expect(ctl.document.lines).toEqual(["za"]);
		});
	});

	describe("change notifications", () => {
		it("notifies listeners after each execute", () => {
			const ctl = new EditorController("a");
			const fn = vi.fn();
			ctl.onChange(fn);
			ctl.execute("editor.insertText", { text: "b" });
			ctl.execute("editor.insertText", { text: "c" });
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it("stops notifying after the unsubscribe function runs", () => {
			const ctl = new EditorController("a");
			const fn = vi.fn();
			const off = ctl.onChange(fn);
			off();
			ctl.execute("editor.insertText", { text: "b" });
			expect(fn).not.toHaveBeenCalled();
		});
	});
});
