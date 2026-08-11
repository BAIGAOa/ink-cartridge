import { Box, Text, measureElement, useWindowSize, type DOMElement } from "ink";
import { useI18n, useKeyboard, useMouseRegion } from "ink-cartridge";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { XtermMouseEvent } from "@cartridge-engine/keyboard-engine";
import type { EditorSession } from "../core/session.js";
import { clampFrame } from "./frame-clamp.js";
import { getBarPosition, setBarPosition, useBarPosition } from "./toolbar-store.js";
import { useTreeWidth } from "./tree-width-store.js";

/**
 * Clamp the bar's top-left: inside the terminal, below the information bar,
 * and — while the file tree is open — left of the tree pane.
 */
function clampBarPos(
	left: number,
	top: number,
	width: number,
	height: number,
	columns: number,
	rows: number,
	fileTreeOpen: boolean,
	treeWidth: number,
): { left: number; top: number } {
	const clamped = clampFrame(left, top, columns, rows, width, height);
	const maxLeft = fileTreeOpen ? columns - treeWidth - width : columns - width;
	return {
		left: Math.min(Math.max(0, clamped.left), Math.max(0, maxLeft)),
		top: Math.max(1, clamped.top),
	};
}

/**
 * Props for a single tool button.
 *
 * @prop priority - Hit-test priority over whatever sits underneath (the editor
 *   surface). Buttons must win so clicking them does not also place the cursor.
 * @prop onClick - Called on mouse click and on Enter selection in normal
 *   mode; the event is absent for the keyboard path.
 * @prop text - The text to display on the button.
 * @prop focused - Keyboard focus (normal-mode navigation); overrides hover.
 * @prop onDragStart/onDragMove/onDragEnd - Forwarded from the toolbar. The
 *   engine captures a drag on the pressed region only, so buttons must carry
 *   the drag handlers or dragging from a button would not move the bar.
 * @prop dragging - The bar is being dragged; buttons tint red.
 */
export type ToolButtonProps = {
	priority: number;
	onClick: (event?: XtermMouseEvent) => void;
	text: string;
	focused?: boolean;
	onDragStart?: (event: XtermMouseEvent) => void;
	onDragMove?: (event: XtermMouseEvent) => void;
	onDragEnd?: (event: XtermMouseEvent) => void;
	dragging?: boolean;
};

function ToolButton({
	priority,
	onClick,
	text,
	focused = false,
	onDragStart,
	onDragMove,
	onDragEnd,
	dragging = false,
}: ToolButtonProps) {
	const [hover, setHover] = useState<boolean>(false);
	const ref = useMouseRegion(
		{
			onClick: (event) => onClick(event),
			onEnter: () => setHover(true),
			onLeave: () => setHover(false),
			onDragStart,
			onDragMove,
			onDragEnd,
		},
		{ priority },
	);
	// Dragging outranks everything (the bar is moving), then keyboard focus,
	// then the transient hover tint.
	const borderColor = dragging ? "red" : focused ? "blue" : hover ? "green" : "white";
	return (
		<Box
			ref={ref}
			borderColor={borderColor}
			borderStyle="bold"
			// Match the editor's surface so the floating bar reads as part of it.
			backgroundColor="#1e1e1e"
			height="100%"
			justifyContent="center"
			alignItems="center"
			borderBackgroundColor="#1e1e1e"
			paddingLeft={2}
			paddingRight={2}
		>
			<Text>{text}</Text>
		</Box>
	);
}

/** One tool entry; the list is the extension point for future tools. */
export type Tool = {
	id: string;
	/** i18n key for the button label. */
	labelKey: string;
	onClick: (event?: XtermMouseEvent) => void;
};

export type ToolBarProps = {
	/** Current keyboard mode, passed down by the editor; drives focus display. */
	mode?: string | null;
	/** Tools to render, centered in the bar. Defaults to save + file tree. */
	tools?: Tool[];
	/** File session wired to the default Save tool. */
	session?: EditorSession | null;
	/** Toggles the file-tree pane (default File Tree tool). */
	onToggleFileTree?: () => void;
	/** Opens/closes the in-editor settings layer (default Settings tool). */
	onOpenSettings?: () => void;
	/** Whether the file-tree pane is open; the bar stays left of it. */
	fileTreeOpen?: boolean;
};

/**
 * Floating toolbar, bottom-center of the terminal until the user drags it.
 * Dragging switches it to absolute positioning and clamps it inside the
 * terminal view (clampFrame, top ≥ 1 to preserve the information bar).
 * Purely presentational for now: one centered button with hover/focus states.
 * The editor owns the layer that hosts this bar (and the ctrl+tab toggle);
 * this component only adds the normal-mode keyboard navigation
 * (ctrl+left/ctrl+right move the focus ring, enter selects). The activator
 * is bare Enter, not ctrl+enter: terminals send the same byte (`\r`) for
 * both, so a ctrl-modified Enter can never reach the engine. Insert mode
 * stays mouse-only because these bindings are mode-restricted and never
 * fire there.
 */
export function ToolBar({
	mode = null,
	tools,
	session = null,
	onToggleFileTree,
	onOpenSettings,
	fileTreeOpen = false,
}: ToolBarProps) {
	const { rows, columns } = useWindowSize();
	const { t } = useI18n();
	const { boundKeyboard } = useKeyboard();
	const [activeIndex, setActiveIndex] = useState(0);
	// The default tools need live context, so they are built per instance
	// instead of at module level; `tools` stays the extension point.
	const defaultTools = useMemo<Tool[]>(
		() => [
			{
				id: "save",
				labelKey: "toolbar.save",
				onClick: () => {
					session?.save();
				},
			},
			{
				id: "file-tree",
				labelKey: "toolbar.fileTree",
				onClick: onToggleFileTree ?? (() => {}),
			},
			{
				id: "settings",
				labelKey: "toolbar.settings",
				onClick: onOpenSettings ?? (() => {}),
			},
		],
		[session, onToggleFileTree, onOpenSettings],
	);
	const activeTools = tools ?? defaultTools;
	// null = bar sits at the bottom-center via flex layout; once the user
	// grabs it, absolute positioning takes over so it follows the cursor.
	// Position lives in a module store so erase/re-apply remounts (prop
	// updates) do not reset a dragged bar back to the bottom.
	const pos = useBarPosition();
	// Live pane width, so the drag clamp follows the tree's adaptive size.
	const treeWidth = useTreeWidth();
	const [dragging, setDragging] = useState(false);
	const barRef = useRef<DOMElement | null>(null);
	// Grab offset (where inside the bar the cursor went down) plus the bar's
	// size at grab time, kept in a ref so drag moves need no re-measurement.
	const grabRef = useRef({ dx: 0, dy: 0, width: 0, height: 0 });

	const startDrag = useCallback((event: XtermMouseEvent) => {
		const node = barRef.current;
		if (!node) {
			return;
		}
		// Measure the bar itself, not the hit region — a button may be the
		// captured target, and its rect would put the bar's corner at the
		// button's corner.
		const m = measureElement(node);
		grabRef.current = {
			dx: event.x - m.x - 1,
			dy: event.y - m.y - 1,
			width: m.width,
			height: m.height,
		};
		// Switch from flex centering to absolute positioning at the current
		// rect — seamless, no jump on the first frame.
		setBarPosition({ top: m.y, left: m.x });
		setDragging(true);
	}, []);

	const moveDrag = useCallback(
		(event: XtermMouseEvent) => {
			const { dx, dy, width, height } = grabRef.current;
			setBarPosition(
				clampBarPos(
					event.x - dx - 1,
					event.y - dy - 1,
					width,
					height,
					columns,
					rows,
					fileTreeOpen,
					treeWidth,
				),
			);
		},
		[columns, rows, fileTreeOpen, treeWidth],
	);

	const endDrag = useCallback(() => setDragging(false), []);

	// The drag clamp only runs while dragging — a terminal resize can shrink
	// the viewport under an absolutely-positioned bar afterwards (and opening
	// the file tree can shrink the free area). Re-clamp whenever any of the
	// layout inputs change so the bar never extends past its allowed region.
	useEffect(() => {
		const node = barRef.current;
		if (!node) {
			return;
		}
		// Read the latest position imperatively — no `pos` dependency, so this
		// effect only runs when a layout input actually changes.
		const m = measureElement(node);
		const current = getBarPosition();
		if (!current) {
			return;
		}
		const next = clampBarPos(
			current.left,
			current.top,
			m.width,
			m.height,
			columns,
			rows,
			fileTreeOpen,
			treeWidth,
		);
		if (next.left !== current.left || next.top !== current.top) {
			setBarPosition(next);
		}
	}, [columns, rows, fileTreeOpen, treeWidth]);

	const showFocus = mode === "normal";

	useEffect(() => {
		const unbinds = [
			boundKeyboard(
				["ctrl+left"],
				() => setActiveIndex((i) => (i - 1 + activeTools.length) % activeTools.length),
				{ mode: "normal" },
			),
			boundKeyboard(
				["ctrl+right"],
				() => setActiveIndex((i) => (i + 1) % activeTools.length),
				{ mode: "normal" },
			),
			boundKeyboard(["return"], () => activeTools[activeIndex]?.onClick(), {
				mode: "normal",
			}),
		];
		return () => unbinds.forEach((fn) => fn());
	}, [boundKeyboard, activeTools, activeIndex]);

	return (
		<Box width="100%" height="100%" justifyContent="center" alignItems="flex-end">
			<Box
				ref={barRef}
				position={pos ? "absolute" : undefined}
				top={pos?.top}
				left={pos?.left}
				height={3}
				flexDirection="row"
				justifyContent="center"
				alignItems="center"
			>
				{activeTools.map((tool, index) => (
					<ToolButton
						key={tool.id}
						text={t(tool.labelKey)}
						priority={1}
						focused={showFocus && index === activeIndex}
						onClick={tool.onClick}
						dragging={dragging}
						onDragStart={startDrag}
						onDragMove={moveDrag}
						onDragEnd={endDrag}
					/>
				))}
			</Box>
		</Box>
	);
}
