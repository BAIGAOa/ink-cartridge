import { Box, Text, useBoxMetrics, useCursor } from "ink";
import { useKeyboard, useMouseRegion } from "ink-cartridge";
import React, { useEffect, useRef, useState } from "react";
import { EditorController } from "../core/editor-controller.js";
import { clickToPosition } from "./click-mapping.js";

export type EditorContext = {
	onChance: () => void;
	value: string;
	lineNumberRightSpacing?: number;
	cursorOffset?: number;
	cursorHeightOffset?: number;
	numberOfIndentationSpaces?: number;
};

/**
 * Main editor view: renders line numbers + text and routes every keystroke
 * to the controller as a named command. Rendering diffs via the controller's
 * change notifications; the controller lives in a ref so its state survives
 * re-renders (same pattern the old TextCalculation used).
 */
export function Editor({
	value: initialText,
	lineNumberRightSpacing = 1,
	cursorOffset = 0,
	cursorHeightOffset = 2,
	numberOfIndentationSpaces = 2,
}: EditorContext) {
	const controllerRef = useRef<EditorController | null>(null);
	if (!controllerRef.current) {
		controllerRef.current = new EditorController(initialText, {
			indentWidth: numberOfIndentationSpaces,
		});
	}
	const controller = controllerRef.current;

	const [, forceUpdate] = useState(0);
	useEffect(() => {
		return controller.onChange(() => forceUpdate((n) => n + 1));
	}, [controller]);

	const { setCursorPosition } = useCursor();
	const { boundKeyboard, enableWildcardPriority } = useKeyboard();

	useEffect(() => {
		const removeWildcard = enableWildcardPriority();
		const unbinds: (() => void)[] = [];

		unbinds.push(
			boundKeyboard(["*"], (input) =>
				controller.execute("editor.insertText", { text: input })
			)
		);
		unbinds.push(
			boundKeyboard(["return"], () => controller.execute("editor.splitLine"))
		);
		unbinds.push(
			boundKeyboard(["right"], () => controller.execute("cursor.moveRight"))
		);
		unbinds.push(
			boundKeyboard(["left"], () => controller.execute("cursor.moveLeft"))
		);
		// backspace deletes before the cursor; delete removes after it —
		// the old prototype treated both as backspace.
		unbinds.push(
			boundKeyboard(["backspace"], () => controller.execute("editor.deleteBefore"))
		);
		unbinds.push(
			boundKeyboard(["delete"], () => controller.execute("editor.deleteAfter"))
		);
		unbinds.push(
			boundKeyboard(["up"], () => controller.execute("cursor.moveUp"))
		);
		unbinds.push(
			boundKeyboard(["down"], () => controller.execute("cursor.moveDown"))
		);
		unbinds.push(
			boundKeyboard(["tab"], () => controller.execute("editor.indent"))
		);
		unbinds.push(
			boundKeyboard(["shift+tab"], () => controller.execute("editor.outdent"))
		);

		return () => {
			removeWildcard();
			unbinds.forEach((fn) => fn());
		};
	}, [boundKeyboard, enableWildcardPriority, controller]);

	const ref = useRef(null);
	const { height } = useBoxMetrics(ref);

	const doc = controller.document;
	const lineNumberWidth = doc.getLineNumberWidth();
	const visibleStart = doc.updateScroll(height);
	const effectiveH = height > 0 ? height : doc.lineCount;
	const visibleLines = doc.lines.slice(visibleStart, visibleStart + effectiveH);
	const cursor = doc.cursor;
	const cursorX =
		cursor.visual + lineNumberWidth + lineNumberRightSpacing + cursorOffset;
	const cursorY = cursor.line - visibleStart + cursorHeightOffset;

	setCursorPosition({ x: cursorX, y: cursorY });

	// Mouse: clicks position the cursor; the wheel scrolls one line at a time.
	// The callbacks close over this render's metrics, and useMouseRegion keeps
	// them fresh, so scrollTop/gutter always match what the user sees.
	const mouseRef = useMouseRegion({
		onClick: (event, rect) => {
			const target = clickToPosition(
				event,
				rect,
				lineNumberWidth + lineNumberRightSpacing,
				doc.scrollTop,
				doc.lineCount
			);
			controller.execute("cursor.setPosition", {
				line: target.line,
				visual: target.visual,
			});
		},
		onWheel: (event) => {
			if (event.button === "wheel-up") {
				controller.execute("cursor.pageUp", { height: 1 });
			} else if (event.button === "wheel-down") {
				controller.execute("cursor.pageDown", { height: 1 });
			}
		},
	});

	return (
		<Box ref={mouseRef} height="100%" width="100%" backgroundColor="#1e1e1e">
			<Box ref={ref} height="100%" width="100%" flexDirection="column">
				{visibleLines.map((each, i) => {
					const lineNumber = visibleStart + i;
					return (
						<Box key={lineNumber} flexDirection="row">
							<Box
								width={lineNumberWidth}
								justifyContent="flex-end"
								marginRight={lineNumberRightSpacing}
							>
								<Text bold={cursor.line === lineNumber}>{lineNumber}</Text>
							</Box>
							<Text>{each}</Text>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}
