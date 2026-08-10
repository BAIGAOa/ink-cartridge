import {
	BaseBoundKeyEntry,
	PageBoundKeyEntry,
	BaseSequenceBinding,
  PageSequenceBinding,
} from "./binding.js";
import { defaultTargetsSymbol } from "./default-targets-symbol.js";
import { BaseFocusTarget, FocusTarget, PageFocusTarget } from "./focus.js";
import { KeyRule } from "./key-rule.js";
import { ModalMissCallback } from "./modal.js";
import { ModalMissOptions } from "./options.js";
import { PendingSequence } from "./pending-sequence.js";

/**
 * Use Symbol to avoid conflicts with user-defined layer IDs.
 */
export const pageLayerSymbol: unique symbol = Symbol("pageLayer");

/**
 * The pending-sequence slot of a layer that hosts elements.
 *
 * Either both fields are present (an element-owned sequence is waiting
 * for the next key) or both are null (no sequence is pending).
 */
export type SequenceIdentity =
	| {
			/**
			 * ID of the element whose keyboard started the pending sequence.
			 */
			fromElementId: string;

			/**
			 * The pending sequence for the current layer — only one
			 * waiting sequence per layer is allowed.
			 */
			pendingSequence: PendingSequence;
	  }
	| {
			/**
			 * ID of the element whose keyboard started the pending sequence.
			 */
			fromElementId: null;

			/**
			 * The pending sequence for the current layer — only one
			 * waiting sequence per layer is allowed.
			 */
			pendingSequence: null;
	  };

/**
 * Modal miss listener state for a layer.
 *
 * Mirrors {@link SequenceIdentity}: the two related fields are linked so they
 * are either both present (an active listener registered via
 * {@link useModalMissListener}) or both null (no listener has been registered,
 * or the previous one has been unregistered). The two variants cannot drift
 * apart — {@link onMissOptions} being defined implies {@link onMiss} is also
 * defined, and `onMiss: null` implies `onMissOptions: null`.
 */
export type MissListener =
	| {
			/**
			 * Callback invoked when the active modal receives a key that was not
			 * handled by any binding (registered via {@link useModalMissListener}).
			 */
			onMiss: ModalMissCallback;
			/**
			 * Options controlling the granularity of miss detection.
			 * Always a real object when {@link onMiss} is present — `useModalMissListener`
			 * defaults it to `{}` when called without an options argument.
			 */
			onMissOptions: ModalMissOptions;
	  }
	| {
			/**
			 * No miss listener is registered on this layer.
			 */
			onMiss: null;
			/**
			 * Always null when {@link onMiss} is null.
			 */
			onMissOptions: null;
	  };

/**
 * Focus targets of one named focus group: the target map keyed by
 * focus id, plus the order in which the group's targets are cycled
 * during automatic focus switching.
 *
 * @typeParam TFocusTarget - The focus-target variant held by the group
 *                           (element-level or page-level).
 */
export type FocusTargetsMap<TFocusTarget extends BaseFocusTarget> = {
	/** Focus targets of the group, keyed by their focus id. */
	map: Map<string, TFocusTarget>;
	/**
	 * Order in which the group's targets are cycled during automatic
	 * focus switching.
	 */
	order: string[];
};

/**
 * A single currently active focus target: its id plus the group it was
 * activated from (or the default-group symbol).
 */
export interface CurrentFocusId {
	/** The id of the active focus target. */
	id: string;
	/**
	 * The named group the target was activated from, or
	 * {@link defaultTargetsSymbol} for the default group.
	 */
	fromGroup: string | typeof defaultTargetsSymbol;
}

/**
 * Keyboard state for a layer that hosts elements (as opposed to a
 * page layer).
 */
export interface LayerKeyboardLayer {
	/** The layer ID. */
	layerId: string;

	/**
	 * The layer's pending sequence — only one waiting sequence per
	 * layer is allowed.
	 */
	pendingSequence: SequenceIdentity;

	/** Keyboard data for every element registered on this layer. */
	elementKeyboards: Map<string, ElementKeyboard>;
}

/**
 * Common keyboard data shared by page layers and element keyboards.
 */
export interface BaseKeyboard {
	/** Key rules marked as transparent at the screen level (pass-through). */
	penetrationKeys: KeyRule[];
	/** Key rules stopped at the screen level (propagation barrier). */
	stoppedKeys: KeyRule[];
	/** Keys from globalKeys that this layer has overridden. */
	globalKeyOverrides: Set<string>;

	/** Maps action IDs to the normalized keys that trigger them (screen-level, excludes focus targets). */
	actionKeysMap: Map<string, string[]>;

}

/**
 * Keyboard state for a single element within a layer.
 */
export interface ElementKeyboard extends BaseKeyboard {
	/** Registered screen-level key bindings (evaluation order). */
	bindings: BaseBoundKeyEntry[];
	/**
	 * The element id this keyboard data belongs to, used to scope pending
	 * sequences and cleanup to the exact element.
	 */
	elementId: string;
	/**
	 * The layer this element belongs to (which may be the page layer).
	 */
	associatedLayer: string;
	/**
	 * Keys allowed to pass through the modal barrier to the layers beneath.
	 * Only meaningful for elements in a modal layer.
	 */
	allowedKeys: KeyRule[];

	/**
	 * Miss-listener state for this element.
	 * Only meaningful for elements in a modal layer.
	 */
	missListener: MissListener;

	/**
	 * Focus targets grouped by named focus group: the key is the group name
	 * and the value is the group's target map plus activation order.
	 * Different groups can be active simultaneously within a layer, but
	 * each group can have only one active focus.
	 */
	focusTargets: Map<string, FocusTargetsMap<FocusTarget>>;

	/**
	 * Default focus layer: focus targets not registered in a named group
	 * are stored here. Like named groups, this group allows only one
	 * active focus.
	 */
	defaultTargets: Map<string, FocusTarget>;

	/**
	 * Order in which the default group's focus targets are cycled during
	 * automatic focus switching.
	 */
	defaultFocusOrder: string[];

	/** The currently active focus targets, each with its id and the group
	 * (or the default symbol) it came from. */
	currentFocusIds: CurrentFocusId[];

  /**
	 * Registered sequence bindings, keyed by their first key.
	 * When that key is pressed, the matching `SequenceBinding` is used
	 * to create a {@link PendingSequence} on this layer.
	 */
	sequences: Map<string, BaseSequenceBinding[]>;
}

/**
 * Per-layer keyboard state: bindings, transparent keys, stop keys,
 * and focus targets.
 */
export interface PageKeyboardLayer extends BaseKeyboard {
	/** Registered screen-level key bindings (evaluation order). */
	bindings: PageBoundKeyEntry[];
	/**
	 * The layer's pending sequence, or null when none is waiting —
	 * only one waiting sequence per layer is allowed.
	 */
	pendingSequence: PendingSequence | null;

	/**
	 * Focus targets grouped by named focus group: the key is the group name
	 * and the value is the group's target map plus activation order.
	 * Different groups can be active simultaneously within a layer, but
	 * each group can have only one active focus.
	 */
	focusTargets: Map<string, FocusTargetsMap<PageFocusTarget>>;

	/**
	 * Default focus layer: focus targets not registered in a named group
	 * are stored here. Like named groups, this group allows only one
	 * active focus.
	 */
	defaultTargets: Map<string, PageFocusTarget>;

	/**
	 * Order in which the default group's focus targets are cycled during
	 * automatic focus switching.
	 */
	defaultFocusOrder: string[];

	/** The currently active focus targets, each with its id and the group
	 * (or the default symbol) it came from. */
	currentFocusIds: CurrentFocusId[];

  /**
	 * Registered sequence bindings, keyed by their first key.
	 * When that key is pressed, the matching `SequenceBinding` is used
	 * to create a {@link PendingSequence} on this layer.
	 */
	sequences: Map<string, PageSequenceBinding[]>;
}
