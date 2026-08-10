import type {
	BaseBoundKeyEntry,
	BaseSequenceBinding,
} from "./types/binding.js";
import type { PageKeyboardLayer } from "./types/page-layer.js";

export * from "./types/binding.js";
export * from "./types/default-targets-symbol.js";
export * from "./types/entry.js";
export * from "./types/focus.js";
export * from "./types/key-rule.js";
export * from "./types/keyboard-layer.js";
export * from "./types/modal.js";
export * from "./types/options.js";
export * from "./types/page-layer.js";
export * from "./types/pending-sequence.js";
export * from "./types/processor.js";
export * from "./types/state-sync.js";

/** @deprecated Use {@link PageKeyboardLayer} for page-level keyboard data. */
export type ScreenKeyboardLayer = PageKeyboardLayer;

/** @deprecated Use {@link BaseBoundKeyEntry}. */
export type BoundKeyEntry = BaseBoundKeyEntry;

/** @deprecated Use {@link BaseSequenceBinding}. */
export type SequenceBinding = BaseSequenceBinding;

/** A minimal overlay entry still used by legacy processor helpers. */
export type EngineOverlayEntry = {
	/** The overlay layer id, used for keyboard syncing and mouse-region attribution. */
	id: string;
};

/** A minimal modal entry still used by legacy processor helpers. */
export type EngineModalEntry = {
	/** The modal layer id, used for keyboard syncing and mouse-region attribution. */
	id: string;
};

/** @deprecated Layer kinds are now represented by the layer/owner model. */
export type LayerKind = "screen" | "overlay" | "modal";
