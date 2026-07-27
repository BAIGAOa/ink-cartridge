import { BoundKeyEntry, SequenceBinding } from "./binding.js";
import { defaultTargetsSymbol } from "./default-targets-symbol.js";
import { FocusTarget } from "./focus.js";
import { KeyRule } from "./key-rule.js";
import { ModalMissCallback } from "./modal.js";
import { ModalMissOptions } from "./options.js";
import { PendingSequence } from "./pending-sequence.js";

/**
 * Use Symbol to avoid conflicts with user-defined layer IDs.
 */
export const pageLayerSymbol: unique symbol = Symbol("pageLayer");

export type SequenceIdentity =
	| {
			/**
			 * This sequence is derived from the IDs of elements within a specific layer.
			 */
			fromElementId: string;

			/**
			 * Waiting sequence for the current layer, only one waiting sequence per layer is allowed
			 */
			pendingSequence: PendingSequence;
	  }
	| {
			/**
			 * This sequence is derived from the IDs of elements within a specific layer.
			 */
			fromElementId: null;

			/**
			 * Waiting sequence for the current layer, only one waiting sequence per layer is allowed
			 */
			pendingSequence: null;
	  };

export interface LayerKeyboardLayer {
  /**
   * the layer id
   */
  layerId: string

	/**
	 * Waiting sequence for the current layer, only one waiting sequence per layer is allowed
	 */
	pendingSequence: SequenceIdentity;

	/**
	 * Keyboard layer for all elements below this layer
	 */
	elementKeyboards: Map<string, ElementKeyboard>;
}

export interface BaseKeyboard {
	/** Registered screen-level key bindings (evaluation order). */
	bindings: BoundKeyEntry[];
	/** Key rules marked as transparent at the screen level (pass-through). */
	penetrationKeys: KeyRule[];
	/** Key rules stopped at the screen level (propagation barrier). */
	stoppedKeys: KeyRule[];
	/** Keys from globalKeys that this layer has overridden. */
	globalKeyOverrides: Set<string>;
	/**
	 * Focal layer of the current layer
	 * The key is the group and the value is a Map that represents the group.
	 * Focuses in different groups can be activated within a layer, and each group can have only one focus
	 */
	focusTargets: Map<string, { map: Map<string, FocusTarget>; order: string[] }>;

	/**
	 * Default focus layer, if the focus is not registered in the specified group
	 * The focus will be registered into this
	 * Similarly, there can only be one active focus for this group
	 */
	defaultTargets: Map<string, FocusTarget>;

	/**
	 * All focus of the default focus layer is used for automatic focus switching by default
	 */
	defaultFocusOrder: string[];

	/** The currently active focus target id, or null. */
	currentFocusIds: {
		id: string;
		fromGroup: string | typeof defaultTargetsSymbol;
	}[];

	/** Maps action IDs to the normalized keys that trigger them (screen-level, excludes focus targets). */
	actionKeysMap: Map<string, string[]>;

	/**
	 * Registered sequence bindings, keyed by their first key.
	 * When that key is pressed, the matching `SequenceBinding` is used
	 * to create a {@link PendingSequence} on this layer.
	 */
	sequences: Map<string, SequenceBinding[]>;
}

export interface ElementKeyboard extends BaseKeyboard {
	/**
	 * The layer from which this element originates; it can be a pageLayer.
	 */
	associatedLayer: typeof pageLayerSymbol | string;
	/**
	 * Key indicating that the modal box allows penetration to the underlying layer
	 * Only the modal layer is valid
	 */
	allowedKeys: KeyRule[];

	/**
	 * Callback invoked when the active modal receives a key that was not
	 * handled by any binding (registered via {@link useModalMissListener}).
	 */
	onMiss?: ModalMissCallback;
	/**
	 * Options controlling the granularity of miss detection.
	 * Set alongside {@link onMiss}.
	 */
	onMissOptions?: ModalMissOptions;
}

/**
 * Per-layer keyboard state: bindings, transparent keys, stop keys,
 * and focus targets.
 */
export interface PageKeyboardLayer extends BaseKeyboard {
	/**
	 * Waiting sequence for the current layer, only one waiting sequence per layer is allowed
	 */
	pendingSequence: PendingSequence | null;
}
