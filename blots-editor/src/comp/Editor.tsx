import { Box, Text, useWindowSize } from "ink";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusState, useKeyboard } from "ink-cartridge";
import chalk from "chalk";

export interface EditorProp {
	height: number;
	value: string;
	focusId: string;
	onChange: (value: string) => void;
	isFocus?: boolean
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

function Editor({ value, focusId, onChange, height, isFocus }: EditorProp) {
	const lines = useMemo(() => value.split("\n"), [value]);
	const lineCount = lines.length;
	const [cursor, setCursor] = useState<{ line: number; col: number }>(() => {
		const lastLine = Math.max(0, lineCount - 1);
		return { line: lastLine, col: (lines[lastLine] ?? "").length };
	});

	const focusFromState = useFocusState(focusId);
	const isFocused = isFocus ?? focusFromState;
	const { rows: termHeight, columns } = useWindowSize();
	const viewHeight = Math.max(1, Math.min(height, termHeight));

	const maxStart = Math.max(0, lineCount - viewHeight);

	const [startLine, setStartLine] = useState(() =>
		Math.min(cursor.line, maxStart),
	);

	// Re-clamp when lineCount shrinks (e.g. after deleting lines)
	useEffect(() => {
		if (startLine > maxStart) setStartLine(maxStart);
	}, [maxStart, startLine]);

	const clampStart = useCallback(
		(line: number, prev: number) => {
			if (line < prev) return line;
			if (line >= prev + viewHeight)
				return Math.min(line - viewHeight + 1, maxStart);
			return prev;
		},
		[viewHeight, maxStart],
	);

	useEffect(() => {
		setStartLine((prev) => clampStart(cursor.line, prev));
	}, [cursor.line, clampStart]);

	const visibleLines = useMemo(
		() => lines.slice(startLine, startLine + viewHeight),
		[lines, startLine, viewHeight],
	);

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
						return { line: prev.line, col: prev.col + input.length };
					});
				},
				{ focusId, mode: "editor" },
			),
		);

		unbinds.push(
			boundKeyboard(
				["tab"],
				() => {
					setCursor((prev) => {
						const newLines = [...lines];
						const curLine = newLines[prev.line];
						newLines[prev.line] =
							curLine.slice(0, prev.col) + "  " + curLine.slice(prev.col);
						onChange?.(newLines.join("\n"));
						return { line: prev.line, col: prev.col + 2 };
					});
				},
				{ focusId, mode: "editor" },
			),
		);

		unbinds.push(
			boundKeyboard(
				["left"],
				() => {
					setCursor((prev) => {
						return { line: prev.line, col: Math.max(0, prev.col - 1) };
					});
				},
				{
					focusId,
				},
			),
		);

		unbinds.push(
			boundKeyboard(
				["right"],
				() => {
					setCursor((prev) => {
						return {
							line: prev.line,
							col: Math.min(prev.col + 1, lines[prev.line].length),
						};
					});
				},
				{ focusId },
			),
		);

		unbinds.push(
			boundKeyboard(
				["up"],
				() => {
					setCursor((prev) => {
						if (prev.line === 0) return prev;
						const newLine = prev.line - 1;
						return {
							line: newLine,
							col: Math.min(prev.col, lines[newLine].length),
						};
					});
				},
				{ focusId },
			),
		);

		unbinds.push(
			boundKeyboard(
				["down"],
				() => {
					setCursor((prev) => {
						if (prev.line >= lines.length - 1) return prev;
						const newLine = prev.line + 1;
						return {
							line: newLine,
							col: Math.min(prev.col, lines[newLine].length),
						};
					});
				},
				{ focusId },
			),
		);

		unbinds.push(
			boundKeyboard(
				["return"],
				() => {
					setCursor((prev) => {
						const newLines = [...lines];
						const curLine = newLines[prev.line];
						newLines[prev.line] = curLine.slice(0, prev.col);
						newLines.splice(prev.line + 1, 0, curLine.slice(prev.col));
						onChange?.(newLines.join("\n"));
						return { line: prev.line + 1, col: 0 };
					});
				},
				{ focusId, mode: "editor" },
			),
		);

		unbinds.push(
			boundKeyboard(
				["backspace"],
				() => {
					setCursor((prev) => {
						const newLines = [...lines];
						if (prev.col > 0) {
							const curLine = newLines[prev.line];
							newLines[prev.line] =
								curLine.slice(0, prev.col - 1) + curLine.slice(prev.col);
							onChange?.(newLines.join("\n"));
							return { line: prev.line, col: prev.col - 1 };
						} else if (prev.line > 0) {
							const curLine = newLines[prev.line];
							const prevLine = newLines[prev.line - 1];
							const prevLen = prevLine.length;
							newLines.splice(prev.line, 1);
							newLines[prev.line - 1] = prevLine + curLine;
							onChange?.(newLines.join("\n"));
							return { line: prev.line - 1, col: prevLen };
						}
						return prev;
					});
				},
				{ focusId, mode: "editor" },
			),
		);

		unbinds.push(
			boundKeyboard(
				["delete"],
				() => {
					setCursor((prev) => {
						const newLines = [...lines];
						const curLine = newLines[prev.line];
						if (prev.col < curLine.length) {
							newLines[prev.line] =
								curLine.slice(0, prev.col) + curLine.slice(prev.col + 1);
							onChange?.(newLines.join("\n"));
							return prev;
						} else if (prev.line < newLines.length - 1) {
							const nextLine = newLines[prev.line + 1];
							newLines.splice(prev.line + 1, 1);
							newLines[prev.line] = curLine + nextLine;
							onChange?.(newLines.join("\n"));
							return prev;
						}
						return prev;
					});
				},
				{ focusId, mode: "editor" },
			),
		);

		return () => {
			unbinds.forEach((each) => each());
			unWil();
		};
	}, [boundKeyboard, enableWildcardPriority, focusId, lines, onChange]);

	const padLen = String(lineCount).length;
	const gutterWidth = padLen + 1;
	const contentWidth = Math.max(10, columns - gutterWidth - 6);
	const emptyNum = " ".repeat(gutterWidth);

	return (
		<Box flexDirection="column">
			{visibleLines.map((line, i) => {
				const actualLine = startLine + i;
				const num = (actualLine + 1).toString().padStart(padLen, " ");
				const isCurrentLine = actualLine === cursor.line;

				if (line.length <= contentWidth) {
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
				}

				// Manual wrap for long lines
				const chunks: string[] = [];
				for (let o = 0; o < line.length; o += contentWidth) {
					chunks.push(line.slice(o, o + contentWidth));
				}

				return (
					<Box key={actualLine} flexDirection="column">
						<Text>
							<Text bold={isCurrentLine} dimColor={!isCurrentLine}>
								{num}{" "}
							</Text>
							{isCurrentLine && cursor.col < contentWidth
								? renderLineWithCursor(chunks[0], cursor.col, isFocused)
								: chunks[0]}
						</Text>
						{chunks.slice(1).map((chunk, ci) => {
							const chunkOffset = (ci + 1) * contentWidth;
							const colInChunk = cursor.col - chunkOffset;
							const showCursor =
								isCurrentLine && colInChunk >= 0 && colInChunk < contentWidth;
							return (
								<Text key={`${actualLine}-${ci + 1}`}>
									<Text dimColor>{emptyNum}</Text>
									{showCursor
										? renderLineWithCursor(chunk, colInChunk, isFocused)
										: chunk}
								</Text>
							);
						})}
					</Box>
				);
			})}
		</Box>
	);
}

export default Editor;
