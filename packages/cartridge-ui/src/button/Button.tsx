import React, { useCallback, useRef } from "react";
import { Box } from "ink";
import type { DOMElement } from "ink";
import { useMouseRegion } from "ink-cartridge";
import type { ButtonProps } from "./button-types.js";

/**
 * A declarative mouse button — the component form of {@link useMouseRegion}.
 *
 * Instead of calling the hook and wiring its ref onto a `<Box>` yourself, you
 * pass the same callbacks and options directly as props. The button fills its
 * parent (`width: 100%` / `height: 100%`) by default; any Ink `<Box>` style
 * prop overrides that and constrains the clickable area — a fixed
 * `width`/`height`, `flexGrow`, padding, a border, etc.
 *
 * Children render inside that box, so a label must be wrapped in Ink's
 * `<Text>` (Ink rejects raw string children of a `<Box>`).
 *
 * The rendered `<Box>` forwards its ref. Pass an **object** ref (from
 * `useRef`) so it becomes the region ref itself: sharing that same ref with
 * `boundKeyboard(["return"], onSave, { ref, focusId })` makes a key press and
 * a click converge on one action/focus target. The `clickOnFocus` /
 * `enterOnFocus` / `leaveOffFocus` options then control whether mouse
 * interaction forwards keyboard focus to that binding. A **callback** ref
 * only observes the node — it has no object identity to key the focus map
 * with, so it cannot link keyboard focus.
 *
 * @example
 * Full runnable demo:
 * [Button.example.tsx](https://github.com/BAIGAOa/ink-cartridge/blob/main/packages/cartridge-ui/examples/Button.example.tsx)
 * — the object ref shared between `<Button>` and `boundKeyboard`, plus `<Text>`
 * labels:
 *
 * ```tsx
 * const boxRef = useRef<DOMElement | null>(null);
 * boundKeyboard(["return"], onSave, { ref: boxRef, focusId: "save-btn" });
 *
 * <Button onClick={onSave} ref={boxRef} flexGrow={1}>
 *   <Text>Save</Text>
 * </Button>
 * ```
 */
export function Button({
  children,
  ref,
  onClick,
  onWheel,
  onEnter,
  onLeave,
  onDragStart,
  onDragMove,
  onDragEnd,
  regionId,
  layerId,
  priority,
  clickOnFocus,
  enterOnFocus,
  leaveOffFocus,
  ...boxProps
}: ButtonProps) {
  // An object ref becomes the region ref itself, so an external
  // `boundKeyboard({ ref, focusId })` sharing that same ref object keys the
  // same entry in the focus map and focus-forwarding hits. A callback ref has
  // no stable object identity to share, so fall back to an internal ref and
  // forward the node through the callback instead.
  const internalRef = useRef<DOMElement | null>(null);
  const regionRef =
    ref && typeof ref !== "function" ? ref : internalRef;

  // `useMouseRegion` re-creates its internal callbacks each render, so the
  // object literals below may change identity without issue.
  useMouseRegion(
    { onClick, onWheel, onEnter, onLeave, onDragStart, onDragMove, onDragEnd },
    { ref: regionRef, regionId, layerId, priority, clickOnFocus, enterOnFocus, leaveOffFocus },
  );

  // Merge the region ref (used for measuring + focus forwarding) with the
  // forwarded ref. The callback MUST keep a stable identity — a new function
  // every render makes React detach and re-attach the ref, and the region's
  // layout listener can then observe the node mid-detach (empty metrics ->
  // changed -> re-render -> infinite loop).
  const setRef = useCallback(
    (node: DOMElement | null) => {
      regionRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      }
    },
    // `regionRef` comes from a custom hook, so the linter cannot prove it is
    // a stable ref — it is (useRef inside useMouseRegion), and including it
    // does not change the callback identity.
    [ref, regionRef],
  );

  return (
    <Box width="100%" height="100%" ref={setRef} {...boxProps}>
      {children}
    </Box>
  );
}
