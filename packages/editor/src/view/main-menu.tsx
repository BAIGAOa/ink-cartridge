import { Box, Text } from "ink";
import { useI18n, useKeyboard, useMouseRegion } from "ink-cartridge";
import React, { useEffect, useState } from "react";
import { Editor } from "./editor.js";
import { Settings } from "./settings.js";
import { gotoScreen } from "ink-cartridge";
import { LOGO_GRAY, LOGO_WHITE } from "./logo.js";

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
			<Box flexDirection="column" gap={1} marginBottom={6}>
				{LOGO_WHITE.map((line, i) => (
					<Box key={i} flexDirection="row">
						<Text color="white">{line} </Text>
						<Text color="gray">{LOGO_GRAY[i]}</Text>
					</Box>
				))}
			</Box>
			<Box flexDirection="row" gap={6}>
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
