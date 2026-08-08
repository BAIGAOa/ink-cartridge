import { Box, Text, useBoxMetrics, useCursor } from "ink";
import {
	applyElementToModalLayer,
	openModalLayer,
	useI18n,
	useKeyboard,
	useMouseRegion,
} from "ink-cartridge";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { EditorController } from "../core/editor-controller.js";
import { clickToPosition } from "./click-mapping.js";
import { CommandBar } from "./command-bar.js";
import { InformationBar } from "./information-bar.js";

export type EditorContext = {
	onChance?: () => void;
	value?: string;
	lineNumberRightSpacing?: number;
	cursorOffset?: number;
	cursorHeightOffset?: number;
	numberOfIndentationSpaces?: number;
};

/**
 * Main editor view: renders the status bar + line numbers + text, routes
 * every keystroke to the controller as a named command, and splits
 * bindings by mode — insert keeps the classic editing keys, normal gets
 * hjkl + arrow-key movement and the `:` command bar.
 */
export function Editor({
	value: initialText = "",
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
	const {
		boundKeyboard,
		enableWildcardPriority,
		getCurrentMode,
		registryCompositionKey,
		removeCompositionKey,
		setMode,
	} = useKeyboard();
	const { t } = useI18n();

	// The engine keeps modes in a ref (no React notification), so we mirror
	// switches locally to keep the status bar live.
	const [mode, setLocalMode] = useState<string | null>(() => getCurrentMode());
	const switchMode = useCallback(
		(next: string | null) => {
			setMode(next);
			setLocalMode(next);
		},
		[setMode],
	);

	const openCommandBar = useCallback(() => {
		openModalLayer("command", 100);
		applyElementToModalLayer("command", {
			elementId: "command-input",
			element: CommandBar,
		});
	}, []);

	useEffect(() => {
		const removeWildcard = enableWildcardPriority();
		const unbinds: (() => void)[] = [];
		const bind = (
			keys: string[],
			handler: (input: string) => void,
			options: { mode?: string } = {},
		) => {
			unbinds.push(boundKeyboard(keys, handler, options));
		};

		// insert mode: classic editing
		bind(
			["*"],
			(input) => controller.execute("editor.insertText", { text: input }),
			{ mode: "insert" },
		);
		bind(["return"], () => controller.execute("editor.splitLine"), { mode: "insert" });
		bind(["right"], () => controller.execute("cursor.moveRight"), { mode: "insert" });
		bind(["left"], () => controller.execute("cursor.moveLeft"), { mode: "insert" });
		// backspace deletes before the cursor; delete removes after it.
		bind(["backspace"], () => controller.execute("editor.deleteBefore"), {
			mode: "insert",
		});
		bind(["delete"], () => controller.execute("editor.deleteAfter"), { mode: "insert" });
		bind(["up"], () => controller.execute("cursor.moveUp"), { mode: "insert" });
		bind(["down"], () => controller.execute("cursor.moveDown"), { mode: "insert" });
		bind(["tab"], () => controller.execute("editor.indent"), { mode: "insert" });
		bind(["shift+tab"], () => controller.execute("editor.outdent"), { mode: "insert" });
		bind(["escape"], () => switchMode("normal"), { mode: "insert" });

		// normal mode: movement + command bar
		bind(["h", "left"], () => controller.execute("cursor.moveLeft"), { mode: "normal" });
		bind(["j"], () => controller.execute("cursor.moveDown"), { mode: "normal" });
		bind(["down"], () => controller.execute("cursor.moveDown"), { mode: "normal" });
		bind(["k", "up"], () => controller.execute("cursor.moveUp"), { mode: "normal" });
		bind(["l", "right"], () => controller.execute("cursor.moveRight"), { mode: "normal" });
		bind(["w"], () => controller.execute("cursor.wordForward"), { mode: "normal" });
		bind(["b"], () => controller.execute("cursor.wordBackward"), { mode: "normal" });
		bind(["0"], () => controller.execute("cursor.lineStart"), { mode: "normal" });
		bind(["$"], () => controller.execute("cursor.lineEnd"), { mode: "normal" });
		// `gg` via the composition engine: the first `g` arms the chain, the
		// second fires documentStart. `mode` keeps typing `g` in insert mode
		// untouched, since composition runs ahead of the `*` wildcard.
		registryCompositionKey({
			key: "g",
			flags: [],
			alternativeFlag: "goto",
			needs: ["goto"],
			optional: true,
			mode: "normal",
			execute: (ctx) => {
				if (ctx.lastFlag === "goto") {
					controller.execute("cursor.documentStart");
					return null;
				}
				// head press: let the engine fill the flag from alternativeFlag
				return { ...ctx, lastFlag: null };
			},
		});
		unbinds.push(() => removeCompositionKey("g"));
		// Ink marks "G" as shift+g, so the normalized key name is "shift+G".
		bind(["shift+G"], () => controller.execute("cursor.documentEnd"), { mode: "normal" });
		bind(["i"], () => switchMode("insert"), { mode: "normal" });
		bind([":"], () => openCommandBar(), { mode: "normal" });

		return () => {
			removeWildcard();
			unbinds.forEach((fn) => fn());
		};
	}, [
		boundKeyboard,
		controller,
		enableWildcardPriority,
		getCurrentMode,
		openCommandBar,
		registryCompositionKey,
		removeCompositionKey,
		switchMode,
	]);

	const ref = useRef(null);
	const { height, width } = useBoxMetrics(ref);

	const doc = controller.document;
	const lineNumberWidth = doc.getLineNumberWidth();
	// Soft-wrap the text at the editable width minus one cell, leaving a
	// right-hand margin so the last column never hugs the edge.
	doc.setWrapWidth(width - lineNumberWidth - lineNumberRightSpacing - 1);
	const visibleStart = doc.updateScroll(height);
	const effectiveH = height > 0 ? height : doc.visualLineCount;
	const cursor = doc.cursor;
	const cursorVisualLine = doc.cursorVisualLine;
	const cursorX =
		doc.cursorSegmentVisual + lineNumberWidth + lineNumberRightSpacing + cursorOffset;
	const cursorY = cursorVisualLine - visibleStart + cursorHeightOffset;

	setCursorPosition({ x: cursorX, y: cursorY });

	// Mouse: clicks position the cursor in any mode. A plain wheel moves the
	// cursor one visual line per notch; Ctrl+wheel scrolls the view without
	// moving the cursor (clamped to the document). Callbacks close over this
	// render's metrics.
	const mouseRef = useMouseRegion({
		onClick: (event, rect) => {
			const target = clickToPosition(
				event,
				rect,
				lineNumberWidth + lineNumberRightSpacing,
				doc.scrollTop,
				doc,
			);
			controller.execute("cursor.setPosition", {
				line: target.line,
				logical: target.logical,
			});
		},
		onWheel: (event) => {
			const up = event.button === "wheel-up";
			const down = event.button === "wheel-down";
			if (!up && !down) {
				return;
			}
			if (event.ctrl) {
				controller.execute("view.scroll", {
					delta: up ? -1 : 1,
					height,
				});
				return;
			}
			controller.execute(up ? "cursor.pageUp" : "cursor.pageDown", {
				height: 1,
			});
		},
	});

	const modeText =
		mode === "normal" ? t("editor.mode.normal") : t("editor.mode.insert");

	return (
		<Box flexDirection="column" height="100%" width="100%">
			<InformationBar
				mode={modeText}
				cursor={{ line: cursor.line, column: cursor.visual }}
			/>
			<Box ref={mouseRef} flexGrow={1} width="100%" backgroundColor="#1e1e1e">
				<Box ref={ref} height="100%" width="100%" flexDirection="column">
					{Array.from({ length: effectiveH }, (_, i) => {
						const vline = visibleStart + i;
						const seg = doc.visualLineAt(vline);
						if (!seg) {
							return null;
						}
						return (
							<Box key={vline} flexDirection="row">
								<Box
									width={lineNumberWidth}
									justifyContent="flex-end"
									marginRight={lineNumberRightSpacing}
								>
									{seg.first ? (
										<Text bold={cursor.line === seg.line}>{seg.line}</Text>
									) : null}
								</Box>
								<Text>{doc.getLine(seg.line).slice(seg.start, seg.end)}</Text>
							</Box>
						);
					})}
				</Box>
			</Box>
		</Box>
	);
}
