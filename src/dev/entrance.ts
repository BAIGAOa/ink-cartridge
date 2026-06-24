import { closeModal, openModal } from "../screen/provider.js";
import { DevScreen } from "./dev-screen.js";
import { DevProps } from "./types.js";


/**
 * Open the developer debugging modal.
 *
 * Calls {@link openModal} with the fixed modal ID `_Dev-Tool_` and
 * the {@link DevScreen} component. Repeated calls while the modal is
 * already open will throw — guard with a ref or state flag to implement
 * a toggle (see example).
 *
 * When open, DevScreen blocks all keyboard events from reaching
 * overlays and screens. The modal provides its own close mechanism
 * via the Escape key.
 *
 * @param top  - Initial vertical position in rows (0 = top of terminal).
 * @param left - Horizontal position in columns.
 *
 * @throws If `ScenarioManagementProvider` is not mounted, or the modal
 *         ID `_Dev-Tool_` is already open.
 *
 * @example
 * ```ts
 * // Toggle with a ref to avoid duplicate-open errors:
 * const devOpenRef = useRef(false);
 * boundKeyboard(['ctrl+d'], () => {
 *   if (devOpenRef.current) {
 *     closeDevTool();
 *     devOpenRef.current = false;
 *   } else {
 *     openDevTool({ top: 0, left: 0 });
 *     devOpenRef.current = true;
 *   }
 * });
 * ```
 */
export function openDevTool({ top, left, zindex }: DevProps & { zindex?: number }) {
  openModal('_Dev-Tool_', DevScreen, {
    top: top,
    left: left
  }, {
    zIndex: zindex,
    renderNow: true
  })
}


/**
 * Close the developer debugging modal.
 *
 * Calls {@link closeModal} for the fixed modal ID `_Dev-Tool_`.
 * Safe to call even if the modal is not currently open — acts as
 * a no-op in that case to support toggle patterns where the modal
 * may have been closed by its own Escape binding.
 *
 * @example
 * ```ts
 * boundKeyboard(['escape'], () => closeDevTool());
 * ```
 */
export function closeDevTool() {
  try {
    closeModal('_Dev-Tool_')
  } catch {
    // Modal already closed — no-op. This handles the case where
    // the Escape key inside DevScreen closed the modal, leaving
    // an external toggle ref stale.
  }
}
