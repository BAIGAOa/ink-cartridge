import { Box, Text } from "ink";
import { back, useI18n, useKeyboard, useMouseRegion } from "ink-cartridge";
import React, { useEffect, useState } from "react";

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

export function Settings() {
	const { t, setLanguage, currentLanguage } = useI18n();
	const { boundKeyboard } = useKeyboard();
	const [index, setIndex] = useState(0);
	const [hovered, setHovered] = useState<number | null>(null);

	useEffect(() => {
		const unbinds = [
			boundKeyboard(["up"], () => setIndex((i) => Math.max(0, i - 1))),
			boundKeyboard(
				["down"],
				() => setIndex((i) => Math.min(LANGUAGES.length - 1, i + 1)),
			),
			boundKeyboard(["return"], () => {
				setLanguage(LANGUAGES[index].code);
			}),
			boundKeyboard(["escape", "backspace"], () => back()),
		];
		return () => unbinds.forEach((fn) => fn());
	}, [boundKeyboard, index, setLanguage]);

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
			<Text dimColor>{t("settings.language")}</Text>
			<Box flexDirection="column" gap={2} marginTop={2}>
				{LANGUAGES.map((lang, i) => (
					<LanguageRow
						key={lang.code}
						label={t(lang.labelKey)}
						selected={currentLanguage === lang.code}
						active={i === index || hovered === i}
						onEnter={() => setHovered(i)}
						onLeave={() => setHovered((h) => (h === i ? null : h))}
						onClick={() => {
						setIndex(i);
						setLanguage(lang.code);
					}}
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
