import type { FocusRef } from "@cartridge-engine/keyboard-engine";
import type { DOMElement } from "ink";
import type { RefObject } from "react";

/**
 * A mouse-region ref's keyboard focus target: which focusId to activate when
 * the region is clicked, and whether the mouse currently holds the focus.
 */
export type RegionFocusEntry = {
  focusId: string | FocusRef;
  focused: boolean;
};

/**
 * Map of mouse-region ref → the keyboard focus it drives. Lives on the page
 * (`Page.regionFocus`) and on each layer/modal layer so entries survive
 * re-renders of `CurrentScreen`.
 */
export type RegionFocusMap = Map<RefObject<DOMElement | null>, RegionFocusEntry>;
