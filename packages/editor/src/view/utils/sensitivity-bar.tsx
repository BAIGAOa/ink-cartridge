import { useI18n } from "@cartridge-engine/i18n";
import { Box, Text } from "ink";
import { useMouseRegion } from "ink-cartridge";
import React from "react";

export const SENSITIVITY_MIN = 1;
export const SENSITIVITY_MAX = 10;
export const SENSITIVITY_STEP = 0.5;
/** Bar cells: (10 - 1) / 0.5 steps, so every cell maps to exactly one step. */
export const BAR_WIDTH = (SENSITIVITY_MAX - SENSITIVITY_MIN) / SENSITIVITY_STEP;

/** Map a 0..1 ratio to a sensitivity value in 0.5 steps. */
export function valueFromRatio(ratio: number): number {
	const r = Math.max(0, Math.min(1, ratio));
	// BAR_WIDTH cells span exactly the 1..10 range (18 steps of 0.5).
	return SENSITIVITY_MIN + Math.round(r * BAR_WIDTH) * SENSITIVITY_STEP;
}

/** Clamp value + dir*step to the valid 1..10 range (0.5 steps). */
export function snapSensitivity(value: number, dir: 1 | -1): number {
	return Math.min(
		SENSITIVITY_MAX,
		Math.max(SENSITIVITY_MIN, value + dir * SENSITIVITY_STEP),
	);
}

type SensitivityBarProps = {
	value: number;
	/** Called on click/drag with the new value (in-memory draft). */
	onChange: (value: number) => void;
	/** Called when the interaction ends — persist the draft. */
	onCommit: () => void;
};

/**
 * Mouse-driven sensitivity slider. Clicking or dragging anywhere on the bar
 * sets the value proportionally (0.5 steps); the fuller the bar, the higher
 * the sensitivity, and the 1..10 range caps it by construction.
 */
export function SensitivityBar({ value, onChange, onCommit }: SensitivityBarProps) {
	const { t } = useI18n();
	// priority 1: the bar sits inside the draggable ModalFrame, whose region
	// overlaps it — the child control must always win the hit test, no matter
	// the registration order after frame drags.
	const ref = useMouseRegion(
		{
			onClick: (event, rect) => {
				onChange(valueFromX(event.x - rect.x));
				onCommit();
			},
			onDragStart: (event, rect) => onChange(valueFromX(event.x - rect.x)),
			onDragMove: (event, rect) => onChange(valueFromX(event.x - rect.x)),
			onDragEnd: () => onCommit(),
		},
		{ priority: 1 },
	);
	const filled = Math.round((value - SENSITIVITY_MIN) / SENSITIVITY_STEP);
	return (
		<Box flexDirection="column" alignItems="center" gap={1}>
			<Box ref={ref} flexDirection="row">
				<Text>{filled > 0 ? "█".repeat(filled) : ""}</Text>
				<Text dimColor>{"░".repeat(BAR_WIDTH - filled)}</Text>
			</Box>
			<Text dimColor>{t("settings.sensitivity.hint")}</Text>
		</Box>
	);
}

/** Value for a click at `localX` cells inside the bar (0-based). */
function valueFromX(localX: number): number {
	return valueFromRatio(localX / BAR_WIDTH);
}
