import { Box, Text, useWindowSize } from "ink";
import {
	applyElementToModalLayer,
	ModalLayerElementContext,
	openModalLayer,
	useI18n,
	useKeyboard,
	useMouseRegion,
	useScreenSystem,
} from "ink-cartridge";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { basename } from "node:path";
import stringWidth from "string-width";
import type { FileNode } from "../core/file-tree-model.js";
import {
	clearFileTreeCache,
	flattenTree,
	resolveFileTreeRoot,
	scanDirectoryCached,
	toggleExpanded,
} from "../core/file-tree-model.js";
import type { EditorSession } from "../core/session.js";
import { useSettings } from "../core/settings/useSettings.js";
import { ModalFrame } from "./modal-frame.js";
import { setTreeWidth } from "./tree-width-store.js";

/** Narrowest the pane can be; wide enough for short names. */
const MIN_TREE_WIDTH = 24;
/** Widest the pane can be — the editor keeps at least 20 columns. */
const MAX_TREE_WIDTH = 60;

export type FileTreeProps = {
	/** The shared file session; clicking a file opens it here. */
	session: EditorSession;
};

/**
 * VSCode-style file tree pinned to the right edge of the terminal (regular
 * layer element). Recursively scans the configured root directory once per
 * settings change; directories expand/collapse on click, files open in the
 * editor (with an unsaved-changes prompt when the buffer is dirty). Scrolling
 * is mouse-wheel only; the pane is fixed — not draggable — and stays below
 * the information bar.
 */
export function FileTree({ session }: FileTreeProps) {
	const { rows, columns } = useWindowSize();
	const { settings } = useSettings();
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const [scrollTop, setScrollTop] = useState(0);
	const [hoveredPath, setHoveredPath] = useState<string | null>(null);

	// scanTick bumps to force a re-scan — the cache never expires on its own.
	const [scanTick, setScanTick] = useState(0);

	const root = useMemo(() => {
		// scanTick is a dependency only to force a re-scan on refresh.
		void scanTick;
		const resolved = resolveFileTreeRoot(settings.fileTree, process.cwd());
		return resolved ? scanDirectoryCached(resolved) : null;
	}, [settings.fileTree, scanTick]);

	// A new scan (root path changed) starts collapsed at the top.
	useEffect(() => {
		setExpanded(new Set());
		setScrollTop(0);
	}, [root]);

	const visibleRows = useMemo(
		() => (root ? flattenTree(root, expanded) : []),
		[root, expanded],
	);

	const handleWheel = useCallback((event: { button: string }) => {
		if (event.button === "wheel-up") {
			setScrollTop((t) => Math.max(0, t - 1));
		} else if (event.button === "wheel-down") {
			setScrollTop((t) => t + 1);
		}
	}, []);

	const openFile = useCallback(
		(path: string) => {
			if (session.isDirty()) {
				openUnsavedPrompt(session, path);
			} else {
				session.open(path);
			}
		},
		[session],
	);

	const toggleDir = useCallback((path: string) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			toggleExpanded(next, path);
			return next;
		});
	}, []);

	const containerRef = useMouseRegion({ onWheel: handleWheel });
	// Manual refresh: the scan cache never expires on its own, so new files
	// only appear after a click here (cache cleared + re-scan).
	const [refreshHovered, setRefreshHovered] = useState(false);
	const refreshRef = useMouseRegion({
		onEnter: () => setRefreshHovered(true),
		onLeave: () => setRefreshHovered(false),
		onClick: () => {
			clearFileTreeCache();
			setScanTick((t) => t + 1);
		},
	});
	const viewportRows = Math.max(1, rows - 4);
	const visible = visibleRows.slice(scrollTop, scrollTop + viewportRows);

	// Fit the pane to its widest visible line (indent + arrow + name), so
	// long file names stay readable; capped so the editor keeps room.
	const treeWidth = useMemo(() => {
		const widest = visible.reduce(
			(max, row) =>
				Math.max(max, (row.depth - 1) * 2 + 2 + stringWidth(row.node.name)),
			0,
		);
		const title = root ? stringWidth(basename(root.path)) : 0;
		// +3 = row padding (1) + the two border cells.
		const content = Math.max(widest, title) + 3;
		return Math.min(Math.max(MIN_TREE_WIDTH, content), MAX_TREE_WIDTH);
	}, [root, visible]);

	// Publish the live width so the toolbar's drag clamp stays in sync
	// (module store — the tree and toolbar are separate layer elements).
	useEffect(() => {
		setTreeWidth(treeWidth);
	}, [treeWidth]);

	return (
		<Box
			ref={containerRef}
			position="absolute"
			top={1}
			left={columns - treeWidth}
			width={treeWidth}
			height={rows - 1}
			borderStyle="bold"
			borderColor="white"
			// Match the editor surface so the pane reads as part of it.
			backgroundColor="#1e1e1e"
			borderBackgroundColor="#1e1e1e"
			flexDirection="column"
		>
			<Box paddingLeft={1} paddingTop={1} flexDirection="row">
				<Text bold>{root ? basename(root.path) : "-"}</Text>
				<Box ref={refreshRef} marginLeft={1}>
					<Text color={refreshHovered ? "green" : "gray"}>↻</Text>
				</Box>
			</Box>
			{root ? (
				visible.map((row) => (
					<TreeRow
						key={row.node.path}
						node={row.node}
						depth={row.depth}
						expanded={expanded.has(row.node.path)}
						hovered={hoveredPath === row.node.path}
						onEnter={() => setHoveredPath(row.node.path)}
						onLeave={() => setHoveredPath((h) => (h === row.node.path ? null : h))}
						onWheel={handleWheel}
						onClick={() => {
							if (row.node.isDir) {
								toggleDir(row.node.path);
							} else {
								openFile(row.node.path);
							}
						}}
					/>
				))
			) : (
				<Box paddingLeft={1}>
					<Text dimColor>No directory</Text>
				</Box>
			)}
		</Box>
	);
}

type TreeRowProps = {
	node: FileNode;
	depth: number;
	/** Whether this directory is expanded (drives the arrow direction). */
	expanded: boolean;
	hovered: boolean;
	onEnter: () => void;
	onLeave: () => void;
	onWheel: (event: { button: string }) => void;
	onClick: () => void;
};

/**
 * One tree line: indent + expand arrow (dirs) + name. The arrow follows the
 * expansion state: collapsed dirs point right, expanded ones point down
 * (VSCode convention); empty dirs show no arrow. Wheel events are forwarded
 * so scrolling works while the cursor is over a row — the engine delivers
 * wheel to the top hit region only.
 */
function TreeRow({ node, depth, expanded, hovered, onEnter, onLeave, onWheel, onClick }: TreeRowProps) {
	const ref = useMouseRegion({ onEnter, onLeave, onClick, onWheel }, { priority: 1 });
	const hasChildren = (node.children?.length ?? 0) > 0;
	const arrow = node.isDir
		? hasChildren
			? expanded
				? "▾ "
				: "▸ "
			: "  "
		: "  ";
	// The root is not rendered, so depth starts at 1; each level adds one indent.
	const indent = "  ".repeat(Math.max(0, depth - 1));
	return (
		<Box ref={ref} paddingLeft={1}>
			<Text inverse={hovered} bold={node.isDir}>
				{indent}
				{arrow}
				{node.name}
			</Text>
		</Box>
	);
}

type PromptButtonProps = {
	label: string;
	hotkey: string;
	active: boolean;
	onEnter: () => void;
	onLeave: () => void;
	onClick: () => void;
};

/** One button of the unsaved-changes prompt (mouse + keyboard hotkey). */
function PromptButton({ label, hotkey, active, onEnter, onLeave, onClick }: PromptButtonProps) {
	const ref = useMouseRegion({ onEnter, onLeave, onClick }, { priority: 1 });
	return (
		<Box ref={ref} paddingLeft={1} paddingRight={1}>
			<Text inverse={active}>
				{label} ({hotkey})
			</Text>
		</Box>
	);
}

type UnsavedPromptProps = {
	title: string;
	onSave: () => void;
	onDiscard: () => void;
	onCancel: () => void;
};

/**
 * Modal "unsaved changes" prompt with three choices (Save / Discard /
 * Cancel), opened when a file-tree click would discard a dirty buffer.
 * Keyboard: s / d / c (Esc also cancels); the buttons are mouse-clickable.
 */
function UnsavedPrompt({ title, onSave, onDiscard, onCancel }: UnsavedPromptProps) {
	const ctx = useContext(ModalLayerElementContext);
	const { t } = useI18n();
	const { boundKeyboard } = useKeyboard();
	const { closeModalLayer } = useScreenSystem();
	const [hovered, setHovered] = useState<"save" | "discard" | "cancel" | null>(null);

	const close = useCallback(() => {
		if (ctx) {
			closeModalLayer(ctx.modalLayer.layerId);
		}
	}, [closeModalLayer, ctx]);

	useEffect(() => {
		if (!ctx) {
			return;
		}
		const unbinds = [
			boundKeyboard(
				["s"],
				() => {
					close();
					onSave();
				},
				{ elementId: ctx.id },
			),
			boundKeyboard(
				["d"],
				() => {
					close();
					onDiscard();
				},
				{ elementId: ctx.id },
			),
			boundKeyboard(
				["c", "escape"],
				() => {
					close();
					onCancel();
				},
				{ elementId: ctx.id },
			),
		];
		return () => unbinds.forEach((fn) => fn());
	}, [boundKeyboard, close, ctx, onCancel, onDiscard, onSave]);

	return (
		<ModalFrame title={title}>
			<Box flexDirection="row" gap={2}>
				<PromptButton
					label={t("confirm.save")}
					hotkey="s"
					active={hovered === "save"}
					onEnter={() => setHovered("save")}
					onLeave={() => setHovered((h) => (h === "save" ? null : h))}
					onClick={() => {
						close();
						onSave();
					}}
				/>
				<PromptButton
					label={t("confirm.discard")}
					hotkey="d"
					active={hovered === "discard"}
					onEnter={() => setHovered("discard")}
					onLeave={() => setHovered((h) => (h === "discard" ? null : h))}
					onClick={() => {
						close();
						onDiscard();
					}}
				/>
				<PromptButton
					label={t("confirm.cancel")}
					hotkey="c"
					active={hovered === "cancel"}
					onEnter={() => setHovered("cancel")}
					onLeave={() => setHovered((h) => (h === "cancel" ? null : h))}
					onClick={() => {
						close();
						onCancel();
					}}
				/>
			</Box>
		</ModalFrame>
	);
}

/**
 * Open the unsaved-changes prompt; on Save the buffer is written first and
 * only then is the target file loaded (a failed save keeps the editor put).
 */
function openUnsavedPrompt(session: EditorSession, targetPath: string): void {
	openModalLayer("unsaved", 100);
	applyElementToModalLayer("unsaved", {
		elementId: "unsaved-prompt",
		element: UnsavedPrompt,
		props: {
			title: "Unsaved changes",
			onSave: () => {
				const saved = session.save();
				if (saved.ok) {
					session.open(targetPath);
				}
			},
			onDiscard: () => session.open(targetPath),
			onCancel: () => {},
		},
	});
}
