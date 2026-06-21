import { closeOverlay, openOverlay } from "../screen/provider.js";
import { DevScreen } from "./dev-screen.js";
import { DevProps } from "./types.js";


/**
 * Open the developer debugging overlay.
 *
 * Calls {@link openOverlay} with the fixed overlay ID `_Dev-Tool_` and
 * the {@link DevScreen} component. Repeated calls while the overlay is
 * already open will throw — guard with a ref or state flag to implement
 * a toggle (see example).
 *
 * @param top  - Initial vertical position in rows (0 = top of terminal).
 * @param left - Horizontal position in columns.
 *
 * @throws If `ScenarioManagementProvider` is not mounted, or the overlay
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
export function openDevTool({top, left}: DevProps){
  openOverlay('_Dev-Tool_', DevScreen, {
    top: top,
    left: left
  })
}


/**
 * Close the developer debugging overlay.
 *
 * Calls {@link closeOverlay} for the fixed overlay ID `_Dev-Tool_`.
 * Safe to call even if the overlay is not currently open — the
 * underlying `closeOverlay` will throw in that case, so guard
 * with a flag when implementing a toggle.
 *
 * @throws If no overlay with ID `_Dev-Tool_` exists.
 *
 * @example
 * ```ts
 * boundKeyboard(['escape'], () => closeDevTool());
 * ```
 */
export function closeDevTool(){
  closeOverlay('_Dev-Tool_')
}
