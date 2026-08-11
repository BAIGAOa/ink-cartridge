import { Box, Text } from "ink";
import {
	applyElement,
	back,
	closeLayer,
	LayerElementContext,
	openLayer,
	useI18n,
	useKeyboard,
	useMouseRegion,
} from "ink-cartridge";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { SettingsEntries } from "./settings.js";
import { ModalFrame } from "./modal-frame.js";

/** Layer hosting the settings panel, opened on top of the menu layer. */
const SETTINGS_PANEL_LAYER_ID = "settings-panel";
const SETTINGS_PANEL_Z_INDEX = 3;

type MenuButtonProps = {
	label: string;
	active: boolean;
	onEnter: () => void;
	onLeave: () => void;
	onClick: () => void;
};

/** Full-width menu button: bold border, editor background, green hover.
 *  priority 1: the button lives inside the draggable ModalFrame and must win
 *  the hit test over the overlapping frame region. */
function MenuButton({ label, active, onEnter, onLeave, onClick }: MenuButtonProps) {
	const ref = useMouseRegion({ onEnter, onLeave, onClick }, { priority: 1 });
	return (
		<Box
			ref={ref}
			borderStyle="bold"
			borderColor={active ? "green" : "white"}
			borderBackgroundColor="#1e1e1e"
			backgroundColor="#1e1e1e"
			height={3}
			width="100%"
			justifyContent="center"
			alignItems="center"
		>
			<Text>{label}</Text>
		</Box>
	);
}

/**
 * The settings panel as its own layer, opened from the editor menu's
 * "Settings" button. Same entries as the settings screen; the Back button
 * (or Esc) closes this layer and returns to the menu layer underneath.
 */
function SettingsPanel() {
	const ctx = useContext(LayerElementContext);
	const { t } = useI18n();
	const [hovered, setHovered] = useState(false);

	const close = useCallback(() => {
		if (ctx) {
			closeLayer(ctx.layer.layerId);
		}
	}, [ctx]);

	return (
		<ModalFrame
			title={t("settings.title")}
			width={44}
			footer={<Text dimColor>{t("settings.back")} (Esc)</Text>}
		>
			<SettingsEntries onExit={close} />
			<MenuButton
				label={t("settings.back")}
				active={hovered}
				onEnter={() => setHovered(true)}
				onLeave={() => setHovered(false)}
				onClick={close}
			/>
		</ModalFrame>
	);
}

/**
 * In-editor menu (regular layer element, opened from the toolbar's Settings
 * button). Two mouse-clickable buttons: "Settings" opens the settings panel
 * as its own layer on top, "Exit" navigates back to the main menu. Esc
 * closes this layer.
 */
export function EditorSetting() {
	const ctx = useContext(LayerElementContext);
	const { t } = useI18n();
	const { boundKeyboard } = useKeyboard();
	const [hovered, setHovered] = useState<"setting" | "exit" | null>(null);

	const close = useCallback(() => {
		if (ctx) {
			closeLayer(ctx.layer.layerId);
		}
	}, [ctx]);

	const openSettings = useCallback(() => {
		openLayer(SETTINGS_PANEL_LAYER_ID, SETTINGS_PANEL_Z_INDEX);
		applyElement(SETTINGS_PANEL_LAYER_ID, {
			elementId: "settings-panel",
			element: SettingsPanel,
		});
	}, []);

	useEffect(() => {
		return boundKeyboard(["escape"], close);
	}, [boundKeyboard, close]);

	return (
		<ModalFrame title={t("editor.setting.title")} width={34}>
			<MenuButton
				label={t("editor.setting.openSetting")}
				active={hovered === "setting"}
				onEnter={() => setHovered("setting")}
				onLeave={() => setHovered((h) => (h === "setting" ? null : h))}
				onClick={openSettings}
			/>
			<MenuButton
				label={t("editor.setting.exit")}
				active={hovered === "exit"}
				onEnter={() => setHovered("exit")}
				onLeave={() => setHovered((h) => (h === "exit" ? null : h))}
				onClick={() => {
					close();
					back();
				}}
			/>
		</ModalFrame>
	);
}
