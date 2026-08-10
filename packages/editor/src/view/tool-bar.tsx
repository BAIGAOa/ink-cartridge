import { Box, Text, measureElement, useWindowSize, type DOMElement } from "ink";
import { useI18n, useKeyboard, useMouseRegion } from "ink-cartridge";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { XtermMouseEvent } from "@cartridge-engine/keyboard-engine";
import { clampFrame } from "./frame-clamp.js";

/**
 * Props for a single tool button.
 *
 * @prop priority - Hit-test priority over whatever sits underneath (the editor
 *   surface). Buttons must win so clicking them does not also place the cursor.
 * @prop onClick - Called on mouse click and on ctrl+enter selection; the event
 *   is absent for the keyboard path.
 * @prop text - The text to display on the button.
 * @prop focused - Keyboard focus (normal-mode navigation); overrides hover.
 * @prop onDragStart/onDragMove/onDragEnd - Forwarded from the toolbar. The
 *   engine captures a drag on the pressed region only, so buttons must carry
 *   the drag handlers or dragging from a button would not move the bar.
 * @prop dragging - The bar is being dragged; buttons tint green like hover.
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
	// Focus is the keyboard state, so it outranks the transient hover color.
	const borderColor = focused ? "blue" : hover || dragging ? "green" : "white";
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
	/** Placeholder until the file-tree feature lands. */
	onClick: (event?: XtermMouseEvent) => void;
};

export type ToolBarProps = {
	/** Current keyboard mode, passed down by the editor; drives focus display. */
	mode?: string | null;
	/** Tools to render, centered in the bar. Defaults to the file-tree entry. */
	tools?: Tool[];
};

const DEFAULT_TOOLS: Tool[] = [
	{
		id: "file-tree",
		labelKey: "toolbar.fileTree",
		onClick: () => {
			// Business logic (opening the file tree) lands here later.
		},
	},
];

/**
 * Floating toolbar, bottom-center of the terminal until the user drags it.
 * Dragging switches it to absolute positioning and clamps it inside the
 * terminal view (clampFrame). Purely presentational for now: one centered
 * button with hover/focus states. The editor owns the layer that hosts this
 * bar (and the ctrl+tab toggle); this component only adds the normal-mode
 * keyboard navigation (ctrl+left/ctrl+right move the focus ring, ctrl+enter
 * selects). Insert mode stays mouse-only because those bindings are
 * mode-restricted and never fire there.
 */
export function ToolBar({ mode = null, tools = DEFAULT_TOOLS }: ToolBarProps) {
	const { rows, columns } = useWindowSize();
	const { t } = useI18n();
	const { boundKeyboard } = useKeyboard();
	const [activeIndex, setActiveIndex] = useState(0);
	// null = bar sits at the bottom-center via flex layout; once the user
	// grabs it, absolute positioning takes over so it follows the cursor.
	const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
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
		setPos({ top: m.y, left: m.x });
		setDragging(true);
	}, []);

	const moveDrag = useCallback(
		(event: XtermMouseEvent) => {
			const { dx, dy, width, height } = grabRef.current;
			setPos(
				clampFrame(
					event.x - dx - 1,
					event.y - dy - 1,
					columns,
					rows,
					width,
					height,
				),
			);
		},
		[columns, rows],
	);

	const endDrag = useCallback(() => setDragging(false), []);

	const showFocus = mode === "normal";

	useEffect(() => {
		const unbinds = [
			boundKeyboard(
				["ctrl+left"],
				() => setActiveIndex((i) => (i - 1 + tools.length) % tools.length),
				{ mode: "normal" },
			),
			boundKeyboard(
				["ctrl+right"],
				() => setActiveIndex((i) => (i + 1) % tools.length),
				{ mode: "normal" },
			),
			boundKeyboard(["ctrl+return"], () => tools[activeIndex]?.onClick(), {
				mode: "normal",
			}),
		];
		return () => unbinds.forEach((fn) => fn());
	}, [boundKeyboard, tools, activeIndex]);

	return (
		<Box width="100%" height="100%" justifyContent="center" alignItems="flex-end">
			<Box
				ref={barRef}
				position={pos ? "absolute" : undefined}
				top={pos?.top}
				left={pos?.left}
				height={4}
				flexDirection="row"
				justifyContent="center"
				alignItems="center"
			>
				{tools.map((tool, index) => (
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
