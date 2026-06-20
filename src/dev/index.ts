import { openOverlay, closeOverlay, registerComponent } from '../screen/index.js';
import { hasComponent } from '../screen/registry.js';
import { DevTool, DEVTOOL_OVERLAY_ID } from './DevTool.js';
import type { DevToolProps } from './DevTool.js';

/**
 * Ensure the DevTool component is registered in the screen registry.
 *
 * Uses {@link hasComponent} for idempotency rather than a module-level flag,
 * so the component is correctly re-registered after `clearRegistry()` in tests.
 */
function ensureRegistered(): void {
  if (!hasComponent(DevTool)) {
    registerComponent(DevTool, {});
  }
}

/**
 * Open the DevTool debug panel as an overlay.
 *
 * The panel displays the current screen stack, active overlays, and keyboard
 * bindings for debugging purposes. Only one DevTool panel can be open at a time.
 *
 * Must be called after {@link ScenarioManagementProvider} is mounted.
 *
 * @param props - Optional props for the DevTool panel.
 * @throws If the provider is not mounted.
 *
 * @example
 * ```ts
 * // Open the dev tool panel
 * openDevTool();
 *
 * // Close it
 * closeDevTool();
 * ```
 */
export function openDevTool(props?: DevToolProps): void {
  ensureRegistered();
  openOverlay(DEVTOOL_OVERLAY_ID, DevTool, props ?? {});
}

/**
 * Close the DevTool debug panel.
 *
 * @throws If the provider is not mounted.
 * @throws If the DevTool overlay is not currently open (detailed error with ID).
 *
 * @example
 * ```ts
 * closeDevTool();
 * ```
 */
export function closeDevTool(): void {
  closeOverlay(DEVTOOL_OVERLAY_ID);
}

export { DevTool, DEVTOOL_OVERLAY_ID };
export type { DevToolProps };
