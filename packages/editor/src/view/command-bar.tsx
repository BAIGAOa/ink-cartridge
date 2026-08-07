import { Box, Text } from "ink";
import {
	back,
	ModalLayerElementContext,
	useI18n,
	useKeyboard,
	useScreenSystem,
} from "ink-cartridge";
import React, { useContext, useEffect, useRef, useState } from "react";

/**
 * Modal command bar (like Helix's `:` prompt). Rendered as a modal layer
 * element, so it exclusively owns the keyboard while open — the editor's
 * bindings (including the insert-mode `*` wildcard) stay dormant.
 */
export function CommandBar() {
	const ctx = useContext(ModalLayerElementContext);
	const { t } = useI18n();
	const { boundKeyboard, setMode } = useKeyboard();
	const { closeModalLayer } = useScreenSystem();
	const [input, setInput] = useState("");
	const [error, setError] = useState<string | null>(null);
	// Handler closures stay stable across renders; the ref holds the truth.
	const inputRef = useRef("");

	useEffect(() => {
		if (!ctx) {
			return;
		}
		const unbinds: (() => void)[] = [];
		unbinds.push(
			boundKeyboard(
				["*"],
				(ch) => {
					inputRef.current += ch;
					setInput(inputRef.current);
					setError(null);
				},
				{ elementId: ctx.id },
			),
		);
		unbinds.push(
			boundKeyboard(
				["backspace"],
				() => {
					inputRef.current = inputRef.current.slice(0, -1);
					setInput(inputRef.current);
				},
				{ elementId: ctx.id },
			),
		);
		unbinds.push(
			boundKeyboard(
				["escape"],
				() => {
					closeModalLayer(ctx.modalLayer.layerId);
					setMode("normal");
				},
				{ elementId: ctx.id },
			),
		);
		unbinds.push(
			boundKeyboard(
				["return"],
				() => {
					const cmd = inputRef.current.trim();
					if (cmd === "quit") {
						closeModalLayer(ctx.modalLayer.layerId);
						setMode("insert");
						back();
					} else if (cmd) {
						setError(t("command.unknown", { params: { cmd } }));
					}
				},
				{ elementId: ctx.id },
			),
		);
		return () => {
			unbinds.forEach((fn) => fn());
		};
	}, [boundKeyboard, closeModalLayer, ctx, setMode, t]);

	return (
		<Box
			flexDirection="row"
			width="100%"
			height={1}
			paddingLeft={1}
			backgroundColor="black"
		>
			<Text color="green">:</Text>
			<Text>{input}</Text>
			{error ? <Text color="red">  {error}</Text> : null}
		</Box>
	);
}
