import React from "react";
import type { MouseRegionCallbacks } from "@cartridge-engine/keyboard-engine";

export type ButtonProps = {
  /**
   * Content rendered inside the button. The button itself fills its parent
   * (100% × 100%), so the clickable size is set by the wrapping Box.
   */
  children?: React.ReactNode;
  /**
   * Mouse region callbacks. `onClick` is the primary action entry point,
   * fired on a mouse click; hover, wheel, and drag callbacks are forwarded
   * as-is.
   */
  callbacks: MouseRegionCallbacks;
  /** Hit-test priority vs overlapping regions — child controls beat containers. */
  priority?: number;
  /**
   * Click forwards keyboard focus to a focusId bound on the same (forwarded)
   * ref — e.g. via `boundKeyboard(..., { ref, focusId })`. Default true.
   */
  clickOnFocus?: boolean;
  /** Hover enter forwards keyboard focus to a focusId bound on the same ref. */
  enterOnFocus?: boolean;
  /** Hover leave clears focus; only applies when enterOnFocus is set. */
  leaveOffFocus?: boolean;
};
