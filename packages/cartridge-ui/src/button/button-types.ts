import React from "react";
import type { MouseRegionCallbacks } from "@cartridge-engine/keyboard-engine";

export type ButtonProps = {
  /**
   * Content rendered inside the button. The button itself fills its parent
   * (100% × 100%), so the clickable size is set by the wrapping Box.
   */
  children?: React.ReactNode;
  /**
   * Mouse region callbacks. `onClick` is the single action entry point:
   * keyboard activation (pressing `keys`) fires it too, without event args.
   */
  callbacks: MouseRegionCallbacks;
  /** Hit-test priority vs overlapping regions — child controls beat containers. */
  priority?: number;
  /** Click forwards keyboard focus to the button's focusId (default true). */
  clickOnFocus?: boolean;
  /** Hover enter forwards keyboard focus. */
  enterOnFocus?: boolean;
  /** Hover leave clears focus; only applies when enterOnFocus is set. */
  leaveOffFocus?: boolean;
  /** Keys that activate the button like a click. */
  keys: string | string[];
  /**
   * Optional keyboard focus target. When set, the key binding is scoped to
   * the focus target and clicks forward focus to it; when omitted, the keys
   * fire on every press (no focus constraint).
   */
  focusId?: string;
};
