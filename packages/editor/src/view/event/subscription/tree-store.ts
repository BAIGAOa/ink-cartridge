import { useSyncExternalStore } from "react";

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * Current width of the file-tree pane, shared with the toolbar.
 *
 * The tree sizes itself to its content, so its width is dynamic; the toolbar
 * must not overlap it, so it reads the live width instead of a constant.
 */
let pos: Rect = { x: 0, y: 0, width: 0, height: 0 };
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function getTreePos(): Rect {
	return pos;
}

export function setTreePos(newPos: Rect): void {
	pos = newPos;
	for (const listener of listeners) {
		listener();
	}
}
/** Reactive binding: re-renders whenever the pane width changes. */
export function useTree(): Rect {
	return useSyncExternalStore(subscribe, getTreePos, getTreePos);
}
