import { Box, Text } from "ink";
import {
	back,
	ModalLayerElementContext,
	useI18n,
	useKeyboard,
	useMouseRegion,
	useScreenSystem,
} from "ink-cartridge";
import React, { useCallback, useContext, useEffect, useState } from "react";

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
	const ref = useMouseRegion({ onEnter, onLeave, onClick });
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
	const { t, setLanguage, currentLanguage } = useI18n();
	const { boundKeyboard } = useKeyboard();
	const { closeModalLayer } = useScreenSystem();
	const [index, setIndex] = useState(0);
	const [hovered, setHovered] = useState<number | null>(null);

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
					setLanguage(LANGUAGES[index].code);
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
	}, [boundKeyboard, closeModalLayer, ctx, index, setLanguage]);

	const apply = (code: string) => {
		if (!ctx) {
			return;
		}
		setLanguage(code);
		closeModalLayer(ctx.modalLayer.layerId);
	};

	return (
		<Box width="100%" height="100%" justifyContent="center" alignItems="center">
			<Box
				flexDirection="column"
				borderStyle="bold"
				borderColor="white"
				backgroundColor="black"
				width={36}
				alignItems="center"
				paddingX={4}
				paddingY={1}
				gap={1}
			>
				<Text bold>{t("settings.language")}</Text>
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
				<Text dimColor>{t("settings.back")} (Esc)</Text>
			</Box>
		</Box>
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
	const [hovered, setHovered] = useState(false);

	const openLanguagePicker = useCallback(() => {
		openModalLayer("language", 50);
		applyElementToModalLayer("language", {
			elementId: "language-picker",
			element: LanguagePicker,
		});
	}, [applyElementToModalLayer, openModalLayer]);

	useEffect(() => {
		const unbinds = [
			boundKeyboard(["return"], () => openLanguagePicker()),
			boundKeyboard(["escape", "backspace"], () => back()),
		];
		return () => unbinds.forEach((fn) => fn());
	}, [boundKeyboard, openLanguagePicker]);

	const currentLabel =
		LANGUAGES.find((lang) => lang.code === currentLanguage)?.labelKey ??
		"settings.language.en";

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
				<SettingRow
					label={t("settings.language")}
					value={t(currentLabel)}
					active={hovered}
					onEnter={() => setHovered(true)}
					onLeave={() => setHovered(false)}
					onClick={openLanguagePicker}
				/>
			</Box>
			<Box marginTop={4}>
				<Text dimColor>
					{t("settings.back")} (Esc)
				</Text>
			</Box>
		</Box>
	);
}
