import { Box, Text, useWindowSize } from "ink";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusState, useKeyboard } from "ink-cartridge";
import chalk from "chalk";
import stringWidth from "string-width";

export interface EditorProp {
	height: number;
	value: string;
	focusId: string;
	onChange: (value: string) => void;
	isFocus?: boolean
}

/** Split a string into chunks where each chunk's visual width ≤ maxWidth. */
function chunkByVisualWidth(s: string, maxWidth: number): string[] {
  const chars = [...s];
  const result: string[] = [];

  let currentLineChars: string[] = [];
  let currentLineWidth = 0;

  for (const ch of chars) {
    const charWidth = stringWidth(ch);

    if (currentLineChars.length > 0 && currentLineWidth + charWidth > maxWidth) {
      result.push(currentLineChars.join(''));
      currentLineChars = [];
      currentLineWidth = 0;
    }

    currentLineChars.push(ch);
    currentLineWidth += charWidth;
  }

  // In fact, there may be a little bit of character left.
  // If these characters are indeed left, it means that they will not actually exceed the current terminal width.
  // So push straight in to prevent loss
  if (currentLineChars.length > 0) {
    result.push(currentLineChars.join(''));
  }

  return result;
}

function renderLineWithCursor(
	line: string,
	col: number,
	showCursor: boolean,
): string {
	if (!showCursor) return line;

	const chars = [...line];
	let result = "";
	for (let i = 0; i < chars.length; i++) {
		result += i === col ? chalk.inverse(chars[i]) : chars[i];
	}

	if (col >= chars.length) result += chalk.inverse(" ");
	return result;
}

function Editor({ value, focusId, onChange, height, isFocus }: EditorProp) {
	const lines = useMemo(() => value.split("\n"), [value]);
	const linesRef = useRef(lines);
	linesRef.current = lines;
	const lineCount = lines.length;
	const [cursor, setCursor] = useState<{ line: number; col: number }>(() => {
		const lastLine = Math.max(0, lineCount - 1);
		return { line: lastLine, col: [...(lines[lastLine] ?? "")].length };
	});

	const focusFromState = useFocusState(focusId);
	const isFocused = isFocus ?? focusFromState;
	const { rows: termHeight, columns } = useWindowSize();
	const viewHeight = Math.max(1, Math.min(height, termHeight));

	const maxStart = Math.max(0, lineCount - viewHeight);

	const [startLine, setStartLine] = useState(() =>
		Math.min(cursor.line, maxStart),
	);

	const { registryCompositionKey, setValueSchema } = useKeyboard()

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

		setValueSchema({
			times: (v): v is number => typeof v === "number",
			action: (v): v is number => typeof v === "number",
		});

		for(const each of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
			registryCompositionKey({
				key: each,
				flags: [{ need: "times", become: "times" }],
				needs: ["times"],
				alternativeFlag: "times",
				optional: true,
				mode: "normal",
				execute: (ctx) => {
					if (ctx.lastFlag === null) {
						return {
							lastFlag: null,
							steps: [each],
							value: Number(each),
						};
					}
					const prev = ctx.value as number;
					return {
						lastFlag: null,
						steps: [...ctx.steps, each],
						value: prev * 10 + Number(each),
					};
				},
			})
		}

		registryCompositionKey({
			key: "left",
			flags: [{ need: "times", become: "action" }],
			alternativeFlag: "action",
			needs: ["times"],
			optional: true,
			execute: (ctx) => {
				const steps = (ctx.value as number) ?? 1;
				setCursor((prev) => ({
					line: prev.line,
					col: Math.max(0, prev.col - steps),
				}));
				return {
					value: steps,
					lastFlag: null,
					steps: [...ctx.steps, "left"],
				};
			},
		});

		registryCompositionKey({
			key: "right",
			flags: [{ need: "times", become: "action" }],
			alternativeFlag: "action",
			needs: ["times"],
			optional: true,
			execute: (ctx) => {
				const steps = (ctx.value as number) ?? 1;
				setCursor((prev) => ({
					line: prev.line,
					col: Math.min(
						prev.col + steps,
						[...linesRef.current[prev.line]].length,
					),
				}));
				return {
					value: steps,
					lastFlag: null,
					steps: [...ctx.steps, "right"],
				};
			},
		});

		registryCompositionKey({
			key: "up",
			flags: [{ need: "times", become: "action" }],
			alternativeFlag: "action",
			needs: ["times"],
			optional: true,
			execute: (ctx) => {
				const steps = (ctx.value as number) ?? 1;
				setCursor((prev) => ({
					line: Math.max(0, prev.line - steps),
					col: Math.min(
						prev.col,
						[...linesRef.current[Math.max(0, prev.line - steps)]].length,
					),
				}));
				return {
					value: steps,
					lastFlag: null,
					steps: [...ctx.steps, "up"],
				};
			},
		});

		registryCompositionKey({
			key: "down",
			flags: [{ need: "times", become: "action" }],
			alternativeFlag: "action",
			needs: ["times"],
			optional: true,
			execute: (ctx) => {
				const steps = (ctx.value as number) ?? 1;
				setCursor((prev) => {
					const newLine = Math.min(
						prev.line + steps,
						linesRef.current.length - 1,
					);
					return {
						line: newLine,
						col: Math.min(prev.col, [...linesRef.current[newLine]].length),
					};
				});
				return {
					value: steps,
					lastFlag: null,
					steps: [...ctx.steps, "down"],
				};
			},
		});

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
						return { line: prev.line, col: prev.col + [...input].length };
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
							const prevLen = [...prevLine].length;
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
						const charLen = [...curLine].length;
						if (prev.col < charLen) {
							const chars = [...curLine];
							chars.splice(prev.col, 1);
							newLines[prev.line] = chars.join("");
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

				if (stringWidth(line) <= contentWidth) {
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

				// Manual wrap for long lines, chunked by visual width
				const chunks = chunkByVisualWidth(line, contentWidth);

				// Build character-index ranges for each chunk
				const chunkRanges: { start: number; end: number }[] = [];
				let charOff = 0;
				for (const ch of chunks) {
					const len = [...ch].length;
					chunkRanges.push({ start: charOff, end: charOff + len });
					charOff += len;
				}
				const totalChars = charOff;

				return (
					<Box key={actualLine} flexDirection="column">
						<Text>
							<Text bold={isCurrentLine} dimColor={!isCurrentLine}>
								{num}{" "}
							</Text>
							{isCurrentLine &&
							(cursor.col < chunkRanges[0].end ||
								(chunks.length === 1 && cursor.col >= totalChars))
								? renderLineWithCursor(
										chunks[0],
										cursor.col,
										isFocused,
									)
								: chunks[0]}
						</Text>
						{chunks.slice(1).map((chunk, ci) => {
							const ci1 = ci + 1;
							const { start, end } = chunkRanges[ci1];
							const isLast = ci1 === chunks.length - 1;
							const showCursor =
								isCurrentLine &&
								((cursor.col >= start && cursor.col < end) ||
									(isLast && cursor.col >= totalChars));
							return (
								<Text key={`${actualLine}-${ci1}`}>
									<Text dimColor>{emptyNum}</Text>
									{showCursor
										? renderLineWithCursor(
												chunk,
												cursor.col - start,
												isFocused,
											)
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
