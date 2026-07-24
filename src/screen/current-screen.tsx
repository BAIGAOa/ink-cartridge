import React from "react";
import { Box, useWindowSize } from "ink";
import { useScreenSystem } from "./hook.js";
import { OverlayContext } from "./OverlayContext.js";
import { ModalContext } from "./ModalContext.js";

/**
 * Render the current screen, overlays, and modals.
 *
 * Multiple overlays are rendered in zIndex order (ascending) so higher
 * zIndex overlays appear on top. Each overlay is wrapped in an
 * OverlayContext.Provider so the keyboard system can isolate per-overlay
 * keyboard layers by overlay ID.
 *
 * Modals are rendered after overlays so they always appear visually on top.
 * Each modal is wrapped in a ModalContext.Provider so the keyboard system
 * can isolate per-modal keyboard layers by modal ID.
 *
 * Architecturally symmetric between overlays and modals.
 */
export function CurrentScreen(): React.ReactNode {
	const {
		pageLayer,
		currentModals,
		renderedModalEntries,
		fullScreen,
		allLayers,
	} = useScreenSystem();
	const { rows } = useWindowSize();

	const layers = allLayers.map((layer) => {
		return (
			<Box position="absolute" top={0} left={0} height="100%" width="100%">
				{Array.from(layer.elements)
					.map((each) => each[1])
					.map((layerElement) => {
						return <layerElement.element />;
					})}
			</Box>
		);
	});

	// Build modal elements with ModalContext wrappers (symmetric to overlays).
	// Uses renderedModalEntries (parallel to currentModals) for correct ID matching.
	const standardLayers = currentModals.map((modalNode, i) => {
		const entry = renderedModalEntries[i];
		if (!entry) return modalNode;
		return React.createElement(
			ModalContext.Provider,
			{
				value: { id: entry.id, originComponent: entry.originComponent },
				key: `mdl-ctx-${entry.id}`,
			},
			modalNode
		);
	});

	return (
		<Box
			flexDirection="column"
			width="100%"
			height={fullScreen ? rows : "100%"}
		>
			{pageLayer}
			{layers}
			{standardLayers.map((w) => w)}
		</Box>
	);
}
