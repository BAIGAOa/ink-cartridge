import { Box, Text, useWindowSize } from "ink";
import { useMouseRegion } from "ink-cartridge";
import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { clampFrame } from "../../utils/view/frame-clamp.js";

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
	// The frame's size, captured at grab time — used by the resize clamp
	// below (a non-null position implies a drag happened, so this is set).
	const frameSizeRef = useRef({ width: 0, height: 0 });

	const frameRef = useMouseRegion({
		onDragStart: (event, rect) => {
			grabOffsetRef.current = {
				dx: event.x - rect.x,
				dy: event.y - rect.y,
			};
			frameSizeRef.current = { width: rect.width, height: rect.height };
			// Switch from flex centering to absolute positioning at the
			// current rect — seamless, no jump on the first frame.
			setPos({ top: rect.y - 1, left: rect.x - 1 });
			setDragging(true);
		},
		onDragMove: (event, rect) => {
			const { dx, dy } = grabOffsetRef.current;
			const clamped = clampFrame(
				event.x - dx - 1,
				event.y - dy - 1,
				columns,
				rows,
				rect.width,
				rect.height,
			);
			// The information bar occupies the top row — keep the frame below
			// it, same as the toolbar.
			setPos({ top: Math.max(1, clamped.top), left: clamped.left });
		},
		onDragEnd: () => setDragging(false),
	});

	// The drag clamp only runs while dragging — a terminal resize can shrink
	// the viewport under a dragged frame afterwards. Re-clamp on every size
	// change so the frame never extends past the edge (top stays ≥ 1 so it
	// cannot overlap the information bar). The centered state (pos null) is
	// flex-laid-out and follows the terminal automatically; a non-null pos
	// implies a drag happened, so frameSizeRef is populated.
	useEffect(() => {
		const { width, height } = frameSizeRef.current;
		if (!width || !height) {
			return;
		}
		setPos((current) => {
			if (!current) {
				return current;
			}
			const clamped = clampFrame(
				current.left,
				current.top,
				columns,
				rows,
				width,
				height,
			);
			const next = { top: Math.max(1, clamped.top), left: clamped.left };
			return next.left === current.left && next.top === current.top ? current : next;
		});
	}, [columns, rows]);

	return (
		// paddingTop keeps the centered frame below the information bar even
		// in short terminals where centering would push it into row 1.
		<Box
			width="100%"
			height="100%"
			paddingTop={1}
			justifyContent="center"
			alignItems="center"
		>
			<Box
				ref={frameRef}
				position={pos ? "absolute" : undefined}
				top={pos?.top}
				left={pos?.left}
				flexDirection="column"
				borderStyle="bold"
				borderColor={dragging ? "green" : "white"}
				// Match the editor surface so dialogs read as part of it.
				backgroundColor="#1e1e1e"
				borderBackgroundColor="#1e1e1e"
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
