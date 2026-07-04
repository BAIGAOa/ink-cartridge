import { useContext, useEffect, useRef, useState } from "react";
import { KeyboardContext, KeyboardContextValue } from "./context.js";
import { OverlayContext } from "../screen/OverlayContext.js";
import { ModalContext } from "../screen/ModalContext.js";
import { useScreenSystem } from "../screen/hook.js";
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
  const overlayCtx = useContext(OverlayContext);
  const modalCtx = useContext(ModalContext);

  const overlayId = overlayCtx?.id ?? null;
  const modalId = modalCtx?.id ?? null;
  const { currentPath } = useScreenSystem();

  if (!ctx) {
    throw new Error(
      "[Ink-Cartridge] useKeyboard() must be called inside a <KeyboardProvider>.",
    );
  }

  const { _pushOwner, _popOwner } = ctx;
  const ownerPushedRef = useRef(false);

  // Lifecycle: overlay mount → push, unmount → pop.
  useEffect(() => {
    if (overlayId) {
      if (!ownerPushedRef.current) {
        _pushOwner(overlayId);
        ownerPushedRef.current = true;
      }
      return () => {
        _popOwner(overlayId);
        ownerPushedRef.current = false;
      };
    }
    return;
  }, [overlayId, _pushOwner, _popOwner]);

  // Lifecycle: modal mount → push, unmount → pop.
  useEffect(() => {
    if (modalId) {
      if (!ownerPushedRef.current) {
        _pushOwner(modalId);
        ownerPushedRef.current = true;
      }
      return () => {
        _popOwner(modalId);
        ownerPushedRef.current = false;
      };
    }
    return;
  }, [modalId, _pushOwner, _popOwner]);

  /**
   * Render-time owner stack sync for persistent layers.
   *
   * When a persistent overlay/modal survives navigation but the user has
   * navigated to a different screen, the owner must be popped from the
   * stack IMMEDIATELY (during render) so that sibling screen components'
   * mount effects see the correct owner when they call boundKeyboard.
   * Re-push happens when the user navigates back to the origin screen.
   *
   * This replaces the previous useEffect-based management which was
   * subject to sibling ordering: screen components' effects fire before
   * the persisting layer's effect, causing bindings to leak into the
   * wrong keyboard layer.
   *
   * @2026-07-04 v3.8.0
   */
  const ownerCtx = modalCtx ?? overlayCtx;
  const ownerId = ownerCtx?.id ?? null;
  const originComponent = ownerCtx?.originComponent;

  if (originComponent && ownerId) {
    const currentTop = currentPath[currentPath.length - 1];
    if (currentTop === originComponent) {
      if (!ownerPushedRef.current) {
        _pushOwner(ownerId);
        ownerPushedRef.current = true;
      }
    } else {
      if (ownerPushedRef.current) {
        _popOwner(ownerId);
        ownerPushedRef.current = false;
      }
    }
  }

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
  const modalCtx = useContext(ModalContext);
  const modalId = modalCtx?.id ?? null;

  useEffect(() => {
    if (!ctx || !modalId) return;
    const unsub = ctx.useModalMissListener(cb, options);
    return unsub;
  }, [ctx, modalId, cb, options]);

  return () => {};
}
