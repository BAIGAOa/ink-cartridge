import React, { forwardRef, useCallback } from "react";
import { Box } from "ink";
import type { DOMElement } from "ink";
import { useMouseRegion } from "ink-cartridge";
import { ButtonProps } from "./button-types.js";

/**
 * A clickable button for mouse input: a click fires `callbacks.onClick`, the
 * primary action entry point; hover, wheel, and drag callbacks are forwarded
 * as-is from `useMouseRegion`.
 *
 * The button forwards its ref so an external keyboard binding can share the
 * same region — e.g. `boundKeyboard(["return"], onSave, { ref, focusId })`
 * makes a key press and a click converge on one action/focus target. The
 * `clickOnFocus` / `enterOnFocus` / `leaveOffFocus` options then control
 * whether mouse interaction forwards keyboard focus to that binding.
 *
 * The button fills its parent (100% × 100%) — wrap it in a sized Box
 * (e.g. with `borderStyle` or a fixed width/height) to control its
 * clickable size.
 */
export const Button = forwardRef<DOMElement, ButtonProps>(function Button(
  {
    children,
    callbacks,
    priority,
    clickOnFocus,
    enterOnFocus,
    leaveOffFocus,
  },
  ref,
) {
  const buttonRef = useMouseRegion(callbacks, {
    priority,
    clickOnFocus,
    enterOnFocus,
    leaveOffFocus,
  });

  // Merge the internal region ref (used for measuring + focus forwarding)
  // with the forwarded ref. The callback MUST keep a stable identity —
  // a new function every render makes React detach and re-attach the ref
  // each commit, and the region's layout listener can then observe the
  // node mid-detach (empty metrics -> changed -> re-render -> infinite
  // loop).
  const setRef = useCallback(
    (node: DOMElement | null) => {
      buttonRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    // buttonRef comes from a custom hook, so the linter cannot prove it is
    // a stable ref — it is (useRef inside useMouseRegion), and adding it
    // does not change the callback identity.
    [ref, buttonRef],
  );

  return <Box height="100%" width="100%" ref={setRef}>{children}</Box>;
});
