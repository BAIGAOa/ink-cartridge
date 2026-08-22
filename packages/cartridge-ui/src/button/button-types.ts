import type { BoxProps, DOMElement } from "ink";
import type { MouseRegionCallbacks, MouseRegionOptions } from "ink-cartridge";
import type { ReactNode, Ref } from "react";

/**
 * Props for {@link Button} — the flattened, declarative form of
 * {@link useMouseRegion}. The hook's `callbacks` and `options` parameters
 * become direct props (e.g. `onClick`, `onEnter`, `regionId`, `priority`),
 * intersected with every Ink `<Box>` style prop so the clickable area can be
 * constrained freely. By default the button fills its parent; pass any Box
 * prop (fixed `width`/`height`, `flexGrow`, padding, …) to size it.
 *
 * @example
 * ```tsx
 * <Button onClick={save} flexGrow={1}><Text>Save</Text></Button>
 * ```
 */
export type ButtonProps = BoxProps &
  MouseRegionCallbacks &
  Omit<MouseRegionOptions, "ref"> & {
    /**
     * Content rendered inside the clickable box. A label must be wrapped in
     * Ink's `<Text>` — Ink rejects raw string children of a `<Box>`.
     */
    children?: ReactNode;
    /**
     * Ref (callback or object) receiving the underlying Ink `<Box>` DOM
     * element once mounted, and `null` on unmount.
     *
     * Pass an **object** ref (from `useRef`) for full keyboard linkage: it
     * becomes the region ref itself, so sharing it with
     * `boundKeyboard(["return"], onSave, { ref, focusId })` keys the same
     * entry in the focus map and a click/Enter converge on one focus target.
     * A **callback** ref only observes the node — no focus-map key, so no
     * keyboard linkage.
     */
    ref?: Ref<DOMElement>;
  };
