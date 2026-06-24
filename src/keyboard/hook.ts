import { useContext, useEffect, useState } from "react";
import { KeyboardContext, KeyboardContextValue } from "./context.js";
import { OverlayContext } from "../screen/OverlayContext.js";
import { ModalContext } from "../screen/ModalContext.js";
import type { ModalMissCallback, ModalMissOptions } from "./types.js";

/**
 * Access the keyboard API from within a React component.
 *
 * Returns `{ boundKeyboard, blockedKey, stop, globalKeys, ... }`.
 *
 * When called inside an overlay component (wrapped in OverlayContext.Provider),
 * keyboard bindings are automatically isolated to the overlay's own layer,
 * keyed by overlay ID. This enables multiple instances of the same component
 * to coexist as separate overlays with independent keyboard state.
 *
 * When called inside a modal component (wrapped in ModalContext.Provider),
 * the same isolation mechanism applies: bindings are scoped to the modal's
 * own layer, keyed by modal ID. This is architecturally symmetric to overlay
 * isolation.
 *
 * Must be used inside a {@link KeyboardProvider}.
 *
 * @throws If no provider is found in the component tree.
 */
export function useKeyboard(): KeyboardContextValue {
  const ctx = useContext(KeyboardContext);
  const overlayId = useContext(OverlayContext);
  const modalId = useContext(ModalContext);

  if (!ctx) {
    throw new Error(
      "[Ink-Cartridge] useKeyboard() must be called inside a <KeyboardProvider>.",
    );
  }

  // Manage the owner stack for overlay isolation.
  // When inside an overlay, push the overlay ID as the current owner so
  // that boundKeyboard, blockedKey, stop, and focus functions operate on
  // the overlay's own keyboard layer instead of the screen's layer.
  useEffect(() => {
    if (overlayId) {
      ctx._pushOwner(overlayId);
      return () => {
        ctx._popOwner(overlayId);
      };
    }
    return;
  }, [overlayId, ctx._pushOwner, ctx._popOwner]);

  // Manage the owner stack for modal isolation (symmetric to overlay).
  // When inside a modal, push the modal ID as the current owner so that
  // keyboard functions operate on the modal's own layer.
  useEffect(() => {
    if (modalId) {
      ctx._pushOwner(modalId);
      return () => {
        ctx._popOwner(modalId);
      };
    }
    return;
  }, [modalId, ctx._pushOwner, ctx._popOwner]);

  return ctx;
}

/**
 * Subscribe to the focus state of a named focus target.
 *
 * Returns `true` when the target with the given `focusId` is the currently
 * active focus target on the current screen layer, `false` otherwise.
 *
 * Re-renders the component when the focus target changes (via Tab,
 * `focusSet`, `focusNext`, `focusPrev`, or `focusUnregister`).
 *
 * @param focusId The focus target id to watch.
 * @returns Whether the named target is currently focused.
 */
export function useFocusState(focusId: string): boolean {
  const { focusCurrent, subscribeFocus } = useKeyboard();
  const [isFocused, setIsFocused] = useState<boolean>(
    () => focusCurrent() === focusId,
  );

  useEffect(() => {
    return subscribeFocus(() => {
      setIsFocused(focusCurrent() === focusId);
    });
  }, [focusId, focusCurrent, subscribeFocus]);

  return isFocused;
}

/**
 * Subscribe to unhandled key presses inside a modal.
 *
 * When the active modal receives a key that was not consumed by any
 * binding, the callback is invoked. The definition of "consumed" is
 * controlled by {@link ModalMissOptions}.
 *
 * Only functions when called inside a modal component (where
 * {@link ModalContext} is set). Outside a modal the hook is a silent
 * no-op — the callback is never invoked.
 *
 * @param cb      - Callback invoked on every key press in the modal.
 * @param options - Controls which mechanics count as "handled".
 * @returns An unsubscribe function.
 */
export function useModalMissListener(
  cb: ModalMissCallback,
  options?: ModalMissOptions,
): () => void {
  const ctx = useContext(KeyboardContext);
  const modalId = useContext(ModalContext);

  useEffect(() => {
    if (!ctx || !modalId) return;
    const unsub = ctx.useModalMissListener(cb, options);
    return unsub;
  }, [ctx, modalId, cb, options]);

  return () => {};
}
