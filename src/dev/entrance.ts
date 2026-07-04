import { closeModal, openModal } from "../screen/provider.js";
import { DevScreen } from "./dev-screen.js";
import { DevProps } from "./types.js";


/**
 * Open the developer debugging modal.
 *
 * Calls {@link openModal} with the fixed modal ID `_Dev-Tool_` and
 * the {@link DevScreen} component, using `persistent: true` by default
 * so the panel survives screen navigation. Keyboard focus is
 * automatically suspended when navigating away and restored when
 * returning to the originating screen.
 *
 * Safe to call when the modal is already open — the underlying
 * {@link openModal} treats duplicate IDs as a no-op, so a simple key
 * binding without a toggle ref suffices:
 *
 * {@link closeDevTool} is the inverse.
 *
 * When open, DevScreen blocks all keyboard events from reaching
 * overlays and screens. Pass `allowKeys` to let specific keys through
 * (e.g. `allowKeys: ['ctrl+d']` to toggle the tool itself).
 *
 * @param top       - Initial vertical position in rows (0 = top of terminal).
 * @param left      - Horizontal position in columns.
 * @param zindex    - Optional modal z-index for stacking order.
 * @param allowKeys - Keys allowed to pass through the modal to layers below.
 * @param persistent - Whether the dev tool survives screen navigation. Defaults to `true`.
 *
 * @throws If `ScenarioManagementProvider` is not mounted.
 *
 * @example
 * ```ts
 * // Press Ctrl+D to open the dev tool (no-op if already open):
 * boundKeyboard(['ctrl+d'], () => openDevTool({ top: 0, left: 0 }));
 *
 * // Toggle requires allowKeys so the second press can pass through:
 * boundKeyboard(['ctrl+d'], () => {
 *   try { openDevTool({ top: 0, left: 0, allowKeys: ['ctrl+d'] }); } catch {}
 * });
 * ```
 * @2026-07-04 v3.8.0
 */
export function openDevTool({ top, left, zindex, allowKeys, persistent = true }: DevProps) {
  openModal('_Dev-Tool_', DevScreen, {
    top: top,
    left: left,
    allowKeys: allowKeys,
  }, {
    zIndex: zindex,
    renderNow: true,
    persistent,
  });
}


/**
 * Close the developer debugging modal.
 *
 * Calls {@link closeModal} for the fixed modal ID `_Dev-Tool_`.
 * Safe to call even if the modal is not currently open — the underlying
 * {@link closeModal} treats non-existent IDs as a no-op.
 *
 * @example
 * ```ts
 * boundKeyboard(['escape'], () => closeDevTool());
 * ```
 */
export function closeDevTool() {
  closeModal('_Dev-Tool_');
}
