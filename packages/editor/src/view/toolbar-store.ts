import { useSyncExternalStore } from "react";

/**
 * Module-level drag position of the floating toolbar.
 *
 * The toolbar element is erased and re-applied whenever its props change
 * (the layer system treats re-applies of an existing element id as no-ops),
 * which would otherwise reset the component's internal position state. An
 * external store survives those remounts, so a dragged bar keeps its spot.
 */
type BarPosition = { top: number; left: number } | null;

let position: BarPosition = null;
const listeners = new Set<() => void>();

function getPosition(): BarPosition {
	return position;
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Read the current persisted position (imperative access for effects). */
export function getBarPosition(): BarPosition {
	return position;
}

/** Update the persisted bar position (drag move / initial grab). */
export function setBarPosition(next: BarPosition): void {
	position = next;
	listeners.forEach((fn) => fn());
}

/** Reactive binding for the toolbar: null = bottom-center flex layout. */
export function useBarPosition(): BarPosition {
	return useSyncExternalStore(subscribe, getPosition, getPosition);
}
