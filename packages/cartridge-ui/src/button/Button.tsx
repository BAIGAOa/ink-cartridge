import React, { forwardRef, useCallback, useEffect, useRef } from "react";
import { Box } from "ink";
import type { DOMElement } from "ink";
import { useKeyboard, useMouseRegion } from "ink-cartridge";
import { ButtonProps } from "./button-types.js";

/**
 * A clickable button: mouse click and key press both fire
 * `callbacks.onClick` — one action entry point for both input channels.
 *
 * Without `focusId` the keys fire on every press; with `focusId` the key
 * binding is scoped to that focus target and clicks forward focus to it
 * (`clickOnFocus`, default true), so mouse and keyboard converge.
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
    keys,
    focusId,
  },
  ref,
) {
  const { boundKeyboard } = useKeyboard();
  const buttonRef = useMouseRegion(callbacks, {
    priority,
    clickOnFocus,
    enterOnFocus,
    leaveOffFocus,
  });

  // Keyboard activation reuses onClick (no mouse event/rect — the handler
  // is expected to ignore the args). Read it through a ref so the binding
  // below never needs the changing callback in its deps.
  const onClickRef = useRef<(() => void) | undefined>(undefined);
  onClickRef.current = callbacks.onClick as unknown as (() => void) | undefined;

  // Register the key binding once per (keys, focusId) — never per render.
  // Inline key arrays change identity every render, so depend on the joined
  // string instead (key names never contain spaces). focusId wires the
  // ref -> focusId mapping that makes clicks forward keyboard focus to
  // this button.
  const keyList = (Array.isArray(keys) ? keys : [keys]).join(" ");
  useEffect(() => {
    return boundKeyboard(
      keyList.split(" "),
      () => onClickRef.current?.(),
      focusId ? { ref: buttonRef, focusId } : undefined,
    );
  }, [boundKeyboard, focusId, keyList, buttonRef]);

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
