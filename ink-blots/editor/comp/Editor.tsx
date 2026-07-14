import { Box, Text } from "ink";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFocusState, useKeyboard } from "../../../src/index.js";
import chalk from "chalk";

export interface EditorProp {
	height: number;
	value: string;
	focusId: string;
	onChange: (value: string) => void;
}

function renderLineWithCursor(
	line: string,
	col: number,
	showCursor: boolean,
): string {
	if (!showCursor) return line;

	let result = "";
	for (let i = 0; i < line.length; i++) {
		result += i === col ? chalk.inverse(line[i]) : line[i];
	}

	if (col >= line.length) result += chalk.inverse(" ");
	return result;
}

function Editor({ value, focusId, onChange, height }: EditorProp) {
	const lines = useMemo(() => value.split("\n"), [value]);
	const lineCount = lines.length;
	const [cursor, setCursor] = useState<{ line: number; col: number }>(() => {
		const lastLine = Math.max(0, lineCount - 1);
		return { line: lastLine, col: (lines[lastLine] ?? "").length };
	});

	const isFocused = useFocusState(focusId);

	const visibleLines = lines; 
	const startLine = 0;

	const { boundKeyboard, enableWildcardPriority } = useKeyboard();

	useEffect(() => {
		const unbinds: (() => void)[] = [];
		const unWil = enableWildcardPriority();

		unbinds.push(
			boundKeyboard(
				["*"],
				(input) => {
					setCursor((prev) => {
						const newLines = [...lines];
						const curLine = newLines[prev.line];
						newLines[prev.line] =
							curLine.slice(0, prev.col) + input + curLine.slice(prev.col);
						onChange?.(newLines.join("\n"));
						return { line: prev.line, col: prev.col + 1 };
					});
				},
				{ focusId },
			),
		);

		return () => {
			unbinds.forEach((each) => each());
			unWil();
		};
	}, [boundKeyboard, enableWildcardPriority, focusId, lines, onChange]);

	return (
		<Box flexDirection="column" height={height}>
			{visibleLines.map((line, i) => {
				const actualLine = startLine + i;
				const padLen = String(lineCount).length;
				const num = (actualLine + 1).toString().padStart(padLen, " ");
				const isCurrentLine = actualLine === cursor.line;

				return (
					<Text key={actualLine}>
						<Text bold={isCurrentLine} dimColor={!isCurrentLine}>
							{num}{" "}
						</Text>
						{isCurrentLine
							? renderLineWithCursor(line, cursor.col, isFocused)
							: line}
					</Text>
				);
			})}
		</Box>
	);
}

export default Editor