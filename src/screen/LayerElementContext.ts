import { createContext } from "react";
import { Layer } from "./types/layer.js";

/**
 * React context for elements rendered inside a layer.
 *
 * Carries the element's ID, its owning layer, the host page, and whether
 * the layer automatically takes over keyboard events.
 */
export const LayerElementContext = createContext<{
  /** This field indicates the ID of this Element. */
  id: string;
  /**
   * This field indicates which layer this Element belongs to.
   */
  layer: Layer;
  /**
   * Host page of the current layer
   */
  hostPage: React.ComponentType<any> | null;
  /**
   * Whether the layer automatically takes over keyboard events: `true` for
   * the host page, or a list of pages scoping the takeover.
   */
  auto: boolean | React.ComponentType<any>[];

  regionFocus: Map<string, boolean>;
} | null>(null);
