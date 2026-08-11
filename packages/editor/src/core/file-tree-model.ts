import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { FileTreeSettings } from "./settings/schema.js";

/**
 * Scan cache: large directories take a while to recurse, and the file tree
 * is re-scanned on every open. Once scanned, a root is served from the cache
 * forever — refreshing the tree is an explicit action (`clearFileTreeCache`
 * via the tree's refresh button), not a time-based expiry.
 */
const scanCache = new Map<string, FileNode>();

/** Clear the scan cache (refresh button, tests). */
export function clearFileTreeCache(): void {
	scanCache.clear();
}

/** Scan a directory, serving repeat calls for the same root from the cache. */
export function scanDirectoryCached(root: string): FileNode | null {
	const hit = scanCache.get(root);
	if (hit) {
		return hit;
	}
	const tree = scanDirectory(root);
	if (tree) {
		scanCache.set(root, tree);
	}
	return tree;
}

/** One entry of the scanned tree. Directories carry their children. */
export type FileNode = {
	/** Entry name (not the full path). */
	name: string;
	/** Absolute path. */
	path: string;
	isDir: boolean;
	/** Children of a directory; undefined for files. */
	children?: FileNode[];
};

/** Directories skipped at every depth (dependency dirs, VCS internals). */
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".next", ".cache"]);
/** Any entry starting with "." is hidden (dotfiles) and skipped. */
const isHidden = (name: string): boolean => name.startsWith(".");

/** Expand a leading `~` to the user's home directory. */
export function expandHome(path: string): string {
	return path === "~" ? homedir() : path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}

/** Resolve the file-tree root from settings: startup dir or custom path. */
export function resolveFileTreeRoot(
	settings: FileTreeSettings,
	startupDir: string,
): string | null {
	if (settings.root === "custom") {
		const custom = expandHome(settings.customPath.trim());
		return custom.length > 0 ? custom : null;
	}
	return startupDir;
}

/**
 * Recursively scan a directory into a tree. Symlinks are never followed
 * (they can loop), dotfiles and known dependency/VCS dirs are skipped.
 * Directories sort before files, both alphabetically.
 *
 * @returns The root node, or null when the directory cannot be read.
 */
export function scanDirectory(root: string): FileNode | null {
	const entries = readDirSafe(root);
	if (!entries) {
		return null;
	}
	const nodes: FileNode[] = [];
	for (const entry of entries) {
		const name = entry.name;
		if (isHidden(name) || entry.isSymbolicLink()) {
			continue;
		}
		const path = join(root, name);
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(name)) {
				continue;
			}
			nodes.push({ name, path, isDir: true, children: scanChildren(path) });
		} else if (entry.isFile()) {
			nodes.push({ name, path, isDir: false });
		}
	}
	// Code-unit compare, not localeCompare: deterministic across locales
	// (localeCompare reorders by the host's locale).
	nodes.sort((a, b) =>
		a.isDir === b.isDir ? (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) : a.isDir ? -1 : 1,
	);
	return { name: root, path: root, isDir: true, children: nodes };
}

function scanChildren(dir: string): FileNode[] | undefined {
	const child = scanDirectory(dir);
	return child?.children;
}

/** Read a directory without throwing; null when unreadable (EACCES etc.). */
function readDirSafe(path: string) {
	try {
		return readdirSync(path, { withFileTypes: true });
	} catch {
		return null;
	}
}

/** One visible tree row produced by flattening with expansion state. */
export type TreeRow = {
	node: FileNode;
	/** Indentation depth (root = 0). */
	depth: number;
};

/**
 * Flatten the tree into the rows to render: children of expanded directories
 * appear under their parent, collapsed subtrees are omitted.
 */
export function flattenTree(
	root: FileNode,
	expanded: ReadonlySet<string>,
): TreeRow[] {
	const rows: TreeRow[] = [];
	const walk = (node: FileNode, depth: number): void => {
		rows.push({ node, depth });
		if (node.isDir && node.children && expanded.has(node.path)) {
			for (const child of node.children) {
				walk(child, depth + 1);
			}
		}
	};
	// The root itself is never rendered (it is the pane's title area).
	for (const child of root.children ?? []) {
		walk(child, 1);
	}
	return rows;
}

/** Expand a directory, or collapse it when already expanded. */
export function toggleExpanded(
	expanded: Set<string>,
	path: string,
): void {
	if (expanded.has(path)) {
		expanded.delete(path);
	} else {
		expanded.add(path);
	}
}
