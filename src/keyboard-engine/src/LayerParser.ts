import { defaultTargetsSymbol } from "./types/default-targets-symbol.js";
import { ElementKeyboard } from "./types/page-layer.js";
import { PipelineContext } from "./types/processor.js";

export function handleTabNavigation<TC>(
	layer: ElementKeyboard,
	ctx: PipelineContext<TC>,
	shift: boolean,
): boolean {
	if (!ctx.eventNames.includes("tab") || layer.defaultFocusOrder.length === 0)
		return false;

	let current: string | null = null;
	for (const each of layer.currentFocusIds) {
		if (each.fromGroup === defaultTargetsSymbol) {
			current = each.id;
			break;
		}
	}
	let idx = current ? layer.defaultFocusOrder.indexOf(current) : -1;
	if (shift) {
		idx = idx <= 0 ? layer.defaultFocusOrder.length - 1 : idx - 1;
	} else {
		idx = (idx + 1) % layer.defaultFocusOrder.length;
	}

	if (current) {
		const currentIdx = layer.currentFocusIds.findIndex((each) => {
			return each.fromGroup === defaultTargetsSymbol;
		});

		// Theoretically, if current above is not null, then currentIdx here should not be -1
		// But I don't believe in theory, so I decided to throw defensive mistakes.
		if (currentIdx === -1) {
			throw new Error(
				`[ink-cartridge] [Unknown Reason] ${current} focus is missing for an unknown reason`
			);
		}

		layer.currentFocusIds.splice(currentIdx, 1);
	}

	layer.currentFocusIds.push({
		id: layer.defaultFocusOrder[idx],
		fromGroup: defaultTargetsSymbol,
	});
	ctx.notifyFocusChange();
	return true;
}
