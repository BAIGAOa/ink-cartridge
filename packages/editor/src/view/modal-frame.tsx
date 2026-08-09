import { Box, Text, useWindowSize } from "ink";
import { useMouseRegion } from "ink-cartridge";
import React, { useRef, useState, type ReactNode } from "react";
import { clampFrame } from "./frame-clamp.js";

type ModalFrameProps = {
	title: string;
	children: ReactNode;
	footer?: ReactNode;
	width?: number;
};

/**
 * Shared draggable modal frame used by the language and sensitivity pickers.
 *
 * Centered by flex layout until the user grabs it, then switches to absolute
 * positioning and follows the cursor (clamped to the terminal). Border turns
 * green while dragging. Callers provide the title, body and optional footer.
 */
export function ModalFrame({
	title,
	children,
	footer,
	width = 36,
}: ModalFrameProps) {
	const { columns, rows } = useWindowSize();
	// null = centered by flex layout; set once dragging starts so the frame
	// keeps following the cursor via absolute positioning (0-based coords).
	const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
	const [dragging, setDragging] = useState(false);
	// Where inside the frame the cursor was grabbed, so the frame doesn't
	// jump so its top-left lands under the cursor on the first drag move.
	const grabOffsetRef = useRef({ dx: 0, dy: 0 });

	const frameRef = useMouseRegion({
		onDragStart: (event, rect) => {
			grabOffsetRef.current = {
				dx: event.x - rect.x,
				dy: event.y - rect.y,
			};
			// Switch from flex centering to absolute positioning at the
			// current rect — seamless, no jump on the first frame.
			setPos({ top: rect.y - 1, left: rect.x - 1 });
			setDragging(true);
		},
		onDragMove: (event, rect) => {
			const { dx, dy } = grabOffsetRef.current;
			setPos(
				clampFrame(
					event.x - dx - 1,
					event.y - dy - 1,
					columns,
					rows,
					rect.width,
					rect.height,
				),
			);
		},
		onDragEnd: () => setDragging(false),
	});

	return (
		<Box width="100%" height="100%" justifyContent="center" alignItems="center">
			<Box
				ref={frameRef}
				position={pos ? "absolute" : undefined}
				top={pos?.top}
				left={pos?.left}
				flexDirection="column"
				borderStyle="bold"
				borderColor={dragging ? "green" : "white"}
				backgroundColor="black"
				width={width}
				alignItems="center"
				paddingX={4}
				paddingY={1}
				gap={1}
			>
				<Text bold>{title}</Text>
				{children}
				{footer}
			</Box>
		</Box>
	);
}
