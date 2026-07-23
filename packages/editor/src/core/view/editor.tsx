import { Box, Text, useCursor } from "ink";
import { useKeyboard } from "ink-cartridge";
import React, { useEffect, useMemo, useRef, useState } from "react";
import stringWidth from "string-width";

export type EditorContext = {
  /**
   * Used to externally get all current text, etc.
   */
  onChance: () => void;
  /**
   * Original text, including some special symbols
   */
  value: string;
  /**
   * What is the right margin of the left line number,
   * which also affects the cursor position
   */
  lineNumberRightSpacing?: number;

  /**
   * Cursor offset. The default value is 1.
   * It is also recommended to be 1. Otherwise,
   * it will cause the cursor visual position to exceed the limit.
   */
  cursorOffset?: number;
  /**
   * Cursor height offset, default is 2
   */
  cursorHeightOffset?: number;
  /**
   * Number of indentation spaces
   * default is 2
   */
  numberOfIndentationSpaces?: number;
};

export type CursorCoordinates = {
  /**
   * How many rows are currently in
   */
  line: number;
  /**
   * How many columns are currently in
   */
  column: number;
};

function splitTextByLines(text: string) {
  if (!text) return [];
  return text.split(/\r?\n/);
}

function insertStr(original: string, index: number, insertText: string) {
  return original.slice(0, index) + insertText + original.slice(index);
}

function deleteCharAt(
  original: string,
  index: number,
  length: number = 1,
): string {
  return original.slice(0, index) + original.slice(index + length);
}

function splitString(string: string, index: number): [string, string] {
  return [string.slice(0, index), string.slice(index)];
}

export function Editor({
  value: line,
  lineNumberRightSpacing = 1,
  cursorOffset = 1,
  cursorHeightOffset = 2,
  numberOfIndentationSpaces = 2,
}: EditorContext) {
  const [value, setValue] = useState<string[]>(() => {
    const lines = splitTextByLines(line);
    return lines;
  });
  const [cursor, setCursor] = useState<CursorCoordinates>({
    line: 0,
    column: 0,
  });
  const checkedLineNumberRightSpacing = useMemo(() => {
    return Math.max(0, lineNumberRightSpacing);
  }, [lineNumberRightSpacing]);

  const currentLineNumberLength = useMemo(() => {
    return Math.max(stringWidth(String(value.length - 1)), 1);
  }, [stringWidth, cursor.line]);

  const { setCursorPosition } = useCursor();
  const boxRef = useRef(null);

  const { boundKeyboard, enableWildcardPriority } = useKeyboard();

  useEffect(() => {
    const removeWildcardPrecedence = enableWildcardPriority();

    const unBinds: (() => void)[] = [];

    unBinds.push(
      boundKeyboard(["*"], (input, _key) => {
        const cur = cursor;
        setValue((prev) => {
          const newValue = [...prev];
          const newStr = insertStr(newValue[cur.line], cur.column, input);
          newValue[cur.line] = newStr;
          return newValue;
        });
        setCursor((prev) => {
          return {
            line: prev.line,
            column: prev.column + input.length,
          };
        });
      }),
    );

    unBinds.push(
      boundKeyboard(["return"], () => {
        const cur = cursor;
        setValue((prev) => {
          const newLine = [...prev];
          const newStr = splitString(newLine[cur.line], cur.column);
          newLine.splice(cur.line, 1);
          newLine.splice(cur.line, 0, newStr[0]);
          newLine.splice(cur.line + 1, 0, newStr[1]);
          return newLine;
        });
        setCursor((prev) => {
          return {
            line: prev.line + 1,
            column: 0,
          };
        });
      }),
    );

    unBinds.push(
      boundKeyboard(["right"], () => {
        setCursor((prev) => ({
          line: prev.line,
          column: Math.min(prev.column + 1, value[cursor.line].length),
        }));
      }),
    );

    unBinds.push(
      boundKeyboard(["left"], () => {
        setCursor((prev) => ({
          line: prev.line,
          column: Math.max(prev.column - 1, 0),
        }));
      }),
    );

    unBinds.push(
      boundKeyboard(["backspace", "delete"], () => {
        let wrap: boolean = false;
        let lastLineLenth: number | null = null;
        setValue((prev) => {
          const newValue = [...prev];
          if (cursor.column === 0 && cursor.line !== 0) {
            wrap = true;
            lastLineLenth = newValue[cursor.line - 1].length;
            const newStr = insertStr(
              newValue[cursor.line - 1],
              newValue[cursor.line - 1].length,
              newValue[cursor.line],
            );
            newValue[cursor.line - 1] = newStr;
            newValue.splice(cursor.line, 1);
          } else {
            const newStr =
              cursor.column === 0
                ? newValue[cursor.line]
                : deleteCharAt(newValue[cursor.line], cursor.column - 1);
            newValue[cursor.line] = newStr;
          }
          return newValue;
        });
        setCursor((prev) => {
          return {
            line: wrap ? prev.line - 1 : prev.line,
            column: lastLineLenth
              ? lastLineLenth
              : Math.max(prev.column - 1, 0),
          };
        });
      }),
    );

    unBinds.push(
      boundKeyboard(["up"], () => {
        setCursor((prev) => {
          return {
            line: Math.max(prev.line - 1, 0),
            column: Math.min(
              value[Math.max(prev.line - 1, 0)].length,
              prev.column,
            ),
          };
        });
      }),
    );

    unBinds.push(
      boundKeyboard(["down"], () => {
        setCursor((prev) => {
          return {
            line: Math.min(prev.line + 1, value.length - 1),
            column: Math.min(
              value[Math.min(prev.line + 1, value.length - 1)].length,
              prev.column,
            ),
          };
        });
      }),
    );

    unBinds.push(
      boundKeyboard(["tab"], () => {
        setValue((prev) => {
          const newValue = [...prev];
          newValue[cursor.line] = insertStr(
            newValue[cursor.line],
            cursor.column,
            " ".repeat(numberOfIndentationSpaces),
          );
          return newValue;
        });
        setCursor((prev) => ({
          line: prev.line,
          column: prev.column + numberOfIndentationSpaces,
        }));
      }),
    );

    unBinds.push(
      boundKeyboard(["shift+tab"], () => {
        setValue((prev) => {
          const newValue = [...prev];
          const currentLine = newValue[cursor.line];
          const leadingSpaces = currentLine.match(/^ */)?.[0].length || 0;

          if (leadingSpaces >= numberOfIndentationSpaces) {
            newValue[cursor.line] = deleteCharAt(
              currentLine,
              0,
              numberOfIndentationSpaces,
            );
            setCursor((prevCursor) => ({
              line: prevCursor.line,
              column: Math.max(
                0,
                prevCursor.column - numberOfIndentationSpaces,
              ),
            }));
          } else if (leadingSpaces > 0) {
            newValue[cursor.line] = deleteCharAt(currentLine, 0, leadingSpaces);
            setCursor((prevCursor) => ({
              line: prevCursor.line,
              column: Math.max(0, prevCursor.column - leadingSpaces),
            }));
          }

          return newValue;
        });
      }),
    );

    return () => {
      removeWildcardPrecedence();
      unBinds.forEach((each) => each());
    };
  }, [boundKeyboard, cursor.column, cursor.line, enableWildcardPriority]);

  const currentLineText = useMemo(
    () => value[cursor.line] ?? "",
    [value, cursor.line],
  );
  const clampedColumn = useMemo(
    () => Math.max(0, Math.min(currentLineText.length, cursor.column)),
    [cursor.column, currentLineText],
  );
  const visualColumn = useMemo(
    () => stringWidth(currentLineText.slice(0, clampedColumn)),
    [stringWidth, currentLineText, clampedColumn],
  );
  const x = useMemo(
    () =>
      visualColumn +
      currentLineNumberLength +
      checkedLineNumberRightSpacing +
      cursorOffset,
    [
      visualColumn,
      currentLineNumberLength,
      checkedLineNumberRightSpacing,
      cursorOffset,
    ],
  );
  const y = useMemo(
    () => cursor.line + cursorHeightOffset,
    [cursor.line, cursorHeightOffset],
  );

  // Testing has revealed a flaw in the cursor operations provided by ink.
  // It could also be due to a specific device.
  // On arm64-based devices—such as when running in Termux—this causes cursor misalignment.
  // The cursor works normally everywhere else.
  // I also don't know how to solve this problem elegantly.
  setCursorPosition({ x: x, y: y });

  return (
    <Box
      ref={boxRef}
      height="100%"
      width="100%"
      backgroundColor="#1e1e1e"
      flexDirection="column"
    >
      {value.map((each, number) => {
        return (
          <Box key={number} flexDirection="row">
            <Box
              width={currentLineNumberLength}
              justifyContent="flex-end"
              marginRight={checkedLineNumberRightSpacing}
            >
              <Text bold>{number}</Text>
            </Box>
            <Text>{each}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
