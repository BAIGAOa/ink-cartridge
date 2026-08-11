import { useSyncExternalStore } from "react";

/**
 * Current width of the file-tree pane, shared with the toolbar.
 *
 * The tree sizes itself to its content, so its width is dynamic; the toolbar
 * must not overlap it, so it reads the live width instead of a constant.
 */
let width = 32;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Imperative read for drag handlers. */
export function getTreeWidth(): number {
	return width;
}

/** Update the reported pane width (no-op when unchanged). */
export function setTreeWidth(next: number): void {
	if (next === width) {
		return;
	}
	width = next;
	listeners.forEach((fn) => fn());
}

/** Reactive binding: re-renders whenever the pane width changes. */
export function useTreeWidth(): number {
	return useSyncExternalStore(subscribe, getTreeWidth, getTreeWidth);
}
