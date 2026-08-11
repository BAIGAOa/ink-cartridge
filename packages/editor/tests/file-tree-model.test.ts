import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	clearFileTreeCache,
	expandHome,
	flattenTree,
	resolveFileTreeRoot,
	scanDirectory,
	scanDirectoryCached,
	toggleExpanded,
} from "../src/core/file-tree-model.js";

function makeTree(): string {
	const root = mkdtempSync(join(tmpdir(), "blots-tree-"));
	mkdirSync(join(root, "src", "components"), { recursive: true });
	mkdirSync(join(root, "node_modules"), { recursive: true });
	mkdirSync(join(root, ".git"), { recursive: true });
	writeFileSync(join(root, "main.ts"), "x", "utf8");
	writeFileSync(join(root, "README.md"), "x", "utf8");
	writeFileSync(join(root, "src", "a.ts"), "x", "utf8");
	writeFileSync(join(root, "src", "components", "b.tsx"), "x", "utf8");
	writeFileSync(join(root, "node_modules", "dep.js"), "x", "utf8");
	writeFileSync(join(root, ".gitignore"), "x", "utf8");
	return root;
}

describe("scanDirectory", () => {
	it("sorts directories before files, both alphabetically", () => {
		const root = makeTree();
		const tree = scanDirectory(root);
		expect(tree?.children?.map((n) => n.name)).toEqual(["src", "README.md", "main.ts"]);
		rmSync(root, { recursive: true, force: true });
	});

	it("skips node_modules, .git, and hidden entries at any depth", () => {
		const root = makeTree();
		const tree = scanDirectory(root);
		const src = tree?.children?.find((n) => n.name === "src");
		expect(src?.children?.map((n) => n.name)).toEqual(["components", "a.ts"]);
		expect(src?.children?.find((n) => n.name === "components")?.children?.map((n) => n.name)).toEqual(["b.tsx"]);
		rmSync(root, { recursive: true, force: true });
	});

	it("returns null for an unreadable root", () => {
		expect(scanDirectory(join(tmpdir(), "does-not-exist-xyz"))).toBeNull();
	});

	it("does not follow symlinked directories", () => {
		const root = makeTree();
		// Junctions need no admin rights on Windows (plain symlinks do).
		symlinkSync(root, join(root, "self-loop"), process.platform === "win32" ? "junction" : undefined);
		const tree = scanDirectory(root);
		expect(tree?.children?.some((n) => n.name === "self-loop")).toBe(false);
		rmSync(root, { recursive: true, force: true });
	});
});

describe("flattenTree / toggleExpanded", () => {
	it("shows only the root level when everything is collapsed", () => {
		const root = makeTree();
		const tree = scanDirectory(root)!;
		const rows = flattenTree(tree, new Set());
		expect(rows.map((r) => r.node.name)).toEqual(["src", "README.md", "main.ts"]);
		expect(rows.every((r) => r.depth === 1)).toBe(true);
		rmSync(root, { recursive: true, force: true });
	});

	it("expands and collapses directories", () => {
		const root = makeTree();
		const tree = scanDirectory(root)!;
		const expanded = new Set<string>();
		const src = tree.children!.find((n) => n.name === "src")!;
		toggleExpanded(expanded, src.path);
		const rows = flattenTree(tree, expanded);
		expect(rows.map((r) => r.node.name)).toEqual([
			"src",
			"components",
			"a.ts",
			"README.md",
			"main.ts",
		]);
		expect(rows[1].depth).toBe(2);
		toggleExpanded(expanded, src.path);
		expect(flattenTree(tree, expanded).length).toBe(3);
		rmSync(root, { recursive: true, force: true });
	});
});

describe("resolveFileTreeRoot / expandHome", () => {
	it("uses the startup directory for the startup mode", () => {
		expect(
			resolveFileTreeRoot({ root: "startup", customPath: "" }, "/start"),
		).toBe("/start");
	});

	it("expands a leading tilde in a custom path", () => {
		expect(expandHome("~/x")).toContain("x");
		expect(resolveFileTreeRoot({ root: "custom", customPath: "~/projects" }, "/start")).toBe(
			join(expandHome("~"), "projects"),
		);
	});

	it("returns null for an empty custom path", () => {
		expect(resolveFileTreeRoot({ root: "custom", customPath: "  " }, "/start")).toBeNull();
	});
});

describe("scanDirectoryCached", () => {
	it("serves a repeat scan from the cache indefinitely", () => {
		const root = makeTree();
		const first = scanDirectoryCached(root);
		// The tree is a snapshot — a new file is invisible until a refresh,
		// proving the second call did not re-scan.
		writeFileSync(join(root, "new.txt"), "x", "utf8");
		const second = scanDirectoryCached(root);
		expect(second).toBe(first);
		expect(second?.children?.some((n) => n.name === "new.txt")).toBe(false);
		rmSync(root, { recursive: true, force: true });
	});

	it("clearFileTreeCache forces a re-scan", () => {
		const root = makeTree();
		const first = scanDirectoryCached(root);
		writeFileSync(join(root, "new.txt"), "x", "utf8");
		clearFileTreeCache();
		const after = scanDirectoryCached(root);
		expect(after).not.toBe(first);
		expect(after?.children?.some((n) => n.name === "new.txt")).toBe(true);
		rmSync(root, { recursive: true, force: true });
	});
});
