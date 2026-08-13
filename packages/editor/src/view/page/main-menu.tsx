import { Box, Text, useWindowSize } from "ink";
import { useI18n, useKeyboard, useMouseRegion } from "ink-cartridge";
import React, { useEffect, useState } from "react";
import { Editor } from "./editor.js";
import { Settings } from "./settings.js";
import { gotoScreen } from "ink-cartridge";
import { getLogo } from "../logo.js";

type MenuButtonProps = {
	label: string;
	shortcut?: string;
	disabled?: boolean;
	onClick?: () => void;
};

/**
 * A borderless text button: the plain Box provides the mouse hit area,
 * hovering inverts the text as visual feedback, disabled buttons dim.
 */
function MenuButton({ label, shortcut, disabled, onClick }: MenuButtonProps) {
	const [hovered, setHovered] = useState(false);
	const ref = useMouseRegion({
		onEnter: () => setHovered(true),
		onLeave: () => setHovered(false),
		onClick: () => {
			if (!disabled) {
				onClick?.();
			}
		},
	});

	return (
		<Box ref={ref} paddingLeft={1} paddingRight={1}>
			<Text inverse={hovered} dimColor={disabled}>
				{label}
			</Text>
			{!disabled && shortcut ? <Text dimColor>  [{shortcut}]</Text> : null}
		</Box>
	);
}

export function MainMenu() {
	const { t } = useI18n();
	const { boundKeyboard } = useKeyboard();
	// The wide logo needs ≈100 columns; below that the words stack vertically.
	// On short screens `getLogo` also shrinks the font so buttons stay visible.
	const { columns, rows } = useWindowSize();
	const narrow = columns < 104;
	const logo = getLogo(columns, rows);

	useEffect(() => {
		const unbinds = [
			boundKeyboard(["e"], () => gotoScreen(Editor, {})),
			boundKeyboard(["s"], () => gotoScreen(Settings, {})),
			boundKeyboard(["q"], () => process.exit(0)),
		];
		return () => unbinds.forEach((fn) => fn());
	}, [boundKeyboard]);

	return (
		<Box
			flexDirection="column"
			justifyContent="center"
			alignItems="center"
			width="100%"
			height="100%"
		>
			<Box flexDirection="column" marginBottom={narrow ? 2 : 6}>
				<Text>{logo}</Text>
			</Box>
			<Box
				flexDirection={narrow ? "column" : "row"}
				gap={narrow ? 1 : 6}
				alignItems="center"
			>
				<MenuButton
					label={t("menu.edit")}
					shortcut="e"
					onClick={() => gotoScreen(Editor, {})}
				/>
				<MenuButton
					label={t("menu.settings")}
					shortcut="s"
					onClick={() => gotoScreen(Settings, {})}
				/>
				<MenuButton label={t("menu.other")} disabled />
				<MenuButton
					label={t("menu.quit")}
					shortcut="q"
					onClick={() => process.exit(0)}
				/>
			</Box>
		</Box>
	);
}
