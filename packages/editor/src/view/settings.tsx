import { Box, Text } from "ink";
import {
	back,
	ModalLayerElementContext,
	useI18n,
	useKeyboard,
	useMouseRegion,
	useScreenSystem,
} from "ink-cartridge";
import React, {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { WheelSensitivity } from "../core/settings/schema.js";
import { useSettings } from "../core/settings/useSettings.js";
import { ModalFrame } from "./modal-frame.js";
import { SensitivityBar, snapSensitivity } from "./sensitivity-bar.js";

const LANGUAGES = [
	{ code: "en", labelKey: "settings.language.en" },
	{ code: "zh", labelKey: "settings.language.zh" },
] as const;

type LanguageRowProps = {
	label: string;
	selected: boolean;
	active: boolean;
	onEnter: () => void;
	onLeave: () => void;
	onClick: () => void;
};

/** Selectable language row with the same hover-highlight style as the menu. */
function LanguageRow({
	label,
	selected,
	active,
	onEnter,
	onLeave,
	onClick,
}: LanguageRowProps) {
	// priority 1: rows live inside the draggable ModalFrame; the child must
	// always win the hit test over the overlapping frame region.
	const ref = useMouseRegion({ onEnter, onLeave, onClick }, { priority: 1 });
	return (
		<Box ref={ref} paddingLeft={1} paddingRight={1}>
			<Text inverse={active}>
				{active ? "> " : "  "}
				{label}
				{selected ? " *" : ""}
			</Text>
		</Box>
	);
}

/**
 * Modal language picker, opened from the settings screen. While open it owns
 * the keyboard (modal layer takeover); picking a language applies it and
 * closes, Esc cancels without changing anything.
 */
function LanguagePicker() {
	const ctx = useContext(ModalLayerElementContext);
	const { t, setLanguage: setI18nLanguage, currentLanguage } = useI18n();
	const { setLanguage: persistLanguage } = useSettings();
	const { boundKeyboard } = useKeyboard();
	const { closeModalLayer } = useScreenSystem();
	const [index, setIndex] = useState(0);
	const [hovered, setHovered] = useState<number | null>(null);

	const applyLanguage = useCallback(
		(code: string) => {
			setI18nLanguage(code);
			persistLanguage(code);
		},
		[setI18nLanguage, persistLanguage],
	);

	useEffect(() => {
		if (!ctx) {
			return;
		}
		const unbinds = [
			boundKeyboard(
				["up"],
				() => setIndex((i) => Math.max(0, i - 1)),
				{ elementId: ctx.id },
			),
			boundKeyboard(
				["down"],
				() => setIndex((i) => Math.min(LANGUAGES.length - 1, i + 1)),
				{ elementId: ctx.id },
			),
			boundKeyboard(
				["return"],
				() => {
					applyLanguage(LANGUAGES[index].code);
					closeModalLayer(ctx.modalLayer.layerId);
				},
				{ elementId: ctx.id },
			),
			boundKeyboard(
				["escape"],
				() => closeModalLayer(ctx.modalLayer.layerId),
				{ elementId: ctx.id },
			),
		];
		return () => unbinds.forEach((fn) => fn());
	}, [applyLanguage, boundKeyboard, closeModalLayer, ctx, index]);

	const apply = (code: string) => {
		if (!ctx) {
			return;
		}
		applyLanguage(code);
		closeModalLayer(ctx.modalLayer.layerId);
	};

	return (
		<ModalFrame
			title={t("settings.language")}
			footer={<Text dimColor>{t("settings.back")} (Esc)</Text>}
		>
			{LANGUAGES.map((lang, i) => (
				<LanguageRow
					key={lang.code}
					label={t(lang.labelKey)}
					selected={currentLanguage === lang.code}
					active={i === index || hovered === i}
					onEnter={() => setHovered(i)}
					onLeave={() => setHovered((h) => (h === i ? null : h))}
					onClick={() => apply(lang.code)}
				/>
			))}
		</ModalFrame>
	);
}

type SensitivityPickerProps = {
	sensitivityKey: keyof WheelSensitivity;
};

/**
 * Modal slider for one wheel sensitivity (cursor or view). The bar is
 * drag/click driven; dragging updates in memory only, release/click persists.
 */
function SensitivityPicker({ sensitivityKey }: SensitivityPickerProps) {
	const ctx = useContext(ModalLayerElementContext);
	const { t } = useI18n();
	const { boundKeyboard } = useKeyboard();
	const { closeModalLayer } = useScreenSystem();
	const { settings, setDraft, setSensitivity, commit } = useSettings();
	const value = settings.wheel[sensitivityKey];

	useEffect(() => {
		if (!ctx) {
			return;
		}
		const unbinds = [
			boundKeyboard(
				["left"],
				() => setSensitivity(sensitivityKey, snapSensitivity(value, -1)),
				{ elementId: ctx.id },
			),
			boundKeyboard(
				["right"],
				() => setSensitivity(sensitivityKey, snapSensitivity(value, 1)),
				{ elementId: ctx.id },
			),
			boundKeyboard(
				["escape"],
				() => closeModalLayer(ctx.modalLayer.layerId),
				{ elementId: ctx.id },
			),
		];
		return () => unbinds.forEach((fn) => fn());
	}, [boundKeyboard, closeModalLayer, ctx, sensitivityKey, value, setSensitivity]);

	const labelKey =
		sensitivityKey === "cursor"
			? "settings.sensitivity.cursor"
			: "settings.sensitivity.view";

	return (
		<ModalFrame
			title={t(labelKey)}
			footer={<Text dimColor>{t("settings.back")} (Esc)</Text>}
		>
			<SensitivityBar
				value={value}
				onChange={(v) => setDraft(sensitivityKey, v)}
				onCommit={commit}
			/>
			<Text>{value.toFixed(1)}×</Text>
		</ModalFrame>
	);
}

type SettingRowProps = {
	label: string;
	value: string;
	active: boolean;
	onEnter: () => void;
	onLeave: () => void;
	onClick: () => void;
};

/** A single settings entry: label plus its current value; opens a picker on activation. */
function SettingRow({
	label,
	value,
	active,
	onEnter,
	onLeave,
	onClick,
}: SettingRowProps) {
	const ref = useMouseRegion({ onEnter, onLeave, onClick });
	return (
		<Box ref={ref} paddingLeft={1} paddingRight={1} flexDirection="row" gap={2}>
			<Text inverse={active}>
				{active ? "> " : "  "}
				{label}
			</Text>
			<Text dimColor>{value}</Text>
		</Box>
	);
}

export function Settings() {
	const { t, currentLanguage } = useI18n();
	const { boundKeyboard } = useKeyboard();
	const { openModalLayer, applyElementToModalLayer } = useScreenSystem();
	const { settings } = useSettings();
	const [index, setIndex] = useState(0);
	const [hovered, setHovered] = useState<number | null>(null);

	const openLanguagePicker = useCallback(() => {
		openModalLayer("language", 50);
		applyElementToModalLayer("language", {
			elementId: "language-picker",
			element: LanguagePicker,
		});
	}, [applyElementToModalLayer, openModalLayer]);

	const openSensitivityPicker = useCallback((key: keyof WheelSensitivity) => {
		const id = `sensitivity-${key}`;
		// `element` is a component type; wrap so the picker receives its key.
		const Picker = () => <SensitivityPicker sensitivityKey={key} />;
		openModalLayer(id, 50);
		applyElementToModalLayer(id, {
			elementId: id,
			element: Picker,
		});
	}, [applyElementToModalLayer, openModalLayer]);

	const currentLabel =
		LANGUAGES.find((lang) => lang.code === currentLanguage)?.labelKey ??
		"settings.language.en";

	const entries = useMemo(
		() => [
			{
				id: "language",
				label: t("settings.language"),
				value: t(currentLabel),
				open: openLanguagePicker,
			},
			{
				id: "cursor",
				label: t("settings.sensitivity.cursor"),
				value: `${settings.wheel.cursor.toFixed(1)}×`,
				open: () => openSensitivityPicker("cursor"),
			},
			{
				id: "view",
				label: t("settings.sensitivity.view"),
				value: `${settings.wheel.view.toFixed(1)}×`,
				open: () => openSensitivityPicker("view"),
			},
		],
		[
			t,
			currentLabel,
			settings.wheel.cursor,
			settings.wheel.view,
			openLanguagePicker,
			openSensitivityPicker,
		],
	);

	useEffect(() => {
		const unbinds = [
			boundKeyboard(["up"], () => setIndex((i) => Math.max(0, i - 1))),
			boundKeyboard(
				["down"],
				() => setIndex((i) => Math.min(entries.length - 1, i + 1)),
			),
			boundKeyboard(["return"], () => entries[index].open()),
			boundKeyboard(["escape", "backspace"], () => back()),
		];
		return () => unbinds.forEach((fn) => fn());
	}, [boundKeyboard, entries, index]);

	return (
		<Box
			flexDirection="column"
			justifyContent="center"
			alignItems="center"
			width="100%"
			height="100%"
			gap={2}
		>
			<Text bold>{t("settings.title")}</Text>
			<Box flexDirection="column" gap={2} marginTop={2}>
				{entries.map((entry, i) => (
					<SettingRow
						key={entry.id}
						label={entry.label}
						value={entry.value}
						active={i === index || hovered === i}
						onEnter={() => setHovered(i)}
						onLeave={() => setHovered((h) => (h === i ? null : h))}
						onClick={entry.open}
					/>
				))}
			</Box>
			<Box marginTop={4}>
				<Text dimColor>
					{t("settings.back")} (Esc)
				</Text>
			</Box>
		</Box>
	);
}
