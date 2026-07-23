import { Box, Text, useBoxMetrics, useCursor } from "ink";
import { useKeyboard } from "ink-cartridge";
import React, { useEffect, useRef, useState } from "react";
import { TextCalculation } from "../text/text-based-calculation.js";

export type EditorContext = {
	onChance: () => void;
	value: string;
	lineNumberRightSpacing?: number;
	cursorOffset?: number;
	cursorHeightOffset?: number;
	numberOfIndentationSpaces?: number;
};

export type { CursorCoordinates } from "../text/text-based-calculation.js";

export function Editor({
	value: initialText,
	lineNumberRightSpacing,
	cursorOffset,
	cursorHeightOffset,
	numberOfIndentationSpaces,
}: EditorContext) {
	const calcRef = useRef<TextCalculation>(null);
	if (!calcRef.current) {
		calcRef.current = new TextCalculation(initialText, {
			lineNumberRightSpacing,
			cursorOffset,
			cursorHeightOffset,
			numberOfIndentationSpaces,
		});
	}
	const calc = calcRef.current;

	const [, forceUpdate] = useState(0);
	useEffect(() => {
		return calc.onChange(() => forceUpdate((n) => n + 1));
	}, [calc]);

	const { setCursorPosition } = useCursor();
	const { boundKeyboard, enableWildcardPriority } = useKeyboard();

	useEffect(() => {
		const removeWildcard = enableWildcardPriority();
		const unbinds: (() => void)[] = [];

		unbinds.push(boundKeyboard(["*"], (input) => calc.insertChar(input)));
		unbinds.push(boundKeyboard(["return"], () => calc.newLine()));
		unbinds.push(boundKeyboard(["right"], () => calc.moveRight()));
		unbinds.push(boundKeyboard(["left"], () => calc.moveLeft()));
		unbinds.push(
			boundKeyboard(["backspace", "delete"], () => calc.backspace())
		);
		unbinds.push(boundKeyboard(["up"], () => calc.moveUp()));
		unbinds.push(boundKeyboard(["down"], () => calc.moveDown()));
		unbinds.push(boundKeyboard(["tab"], () => calc.indent()));
		unbinds.push(boundKeyboard(["shift+tab"], () => calc.outdent()));

		return () => {
			removeWildcard();
			unbinds.forEach((fn) => fn());
		};
	}, [boundKeyboard, enableWildcardPriority, calc]);

	const ref = useRef(null);
	const { height } = useBoxMetrics(ref);

	const lineNumberWidth = calc.getLineNumberWidth();
	const visibleStart = calc.updateScroll(height);
	const effectiveH = height > 0 ? height : calc.lineCount;
	const visibleLines = calc.lines.slice(
		visibleStart,
		visibleStart + effectiveH
	);
	const cursorX = calc.getCursorX(lineNumberWidth);
	const cursorY = calc.cursor.line - visibleStart + calc.cursorHeightOffset;

	setCursorPosition({ x: cursorX, y: cursorY });

	return (
		<Box
			ref={ref}
			height="100%"
			width="100%"
			backgroundColor="#1e1e1e"
			flexDirection="column"
		>
			{visibleLines.map((each, i) => {
				const lineNumber = visibleStart + i;
				return (
					<Box key={lineNumber} flexDirection="row">
						<Box
							width={lineNumberWidth}
							justifyContent="flex-end"
							marginRight={calc.lineNumberRightSpacing}
						>
							<Text bold={calc.cursor.line === lineNumber}>{lineNumber}</Text>
						</Box>
						<Text>{each}</Text>
					</Box>
				);
			})}
		</Box>
	);
}
