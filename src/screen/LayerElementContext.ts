import { createContext } from "react";
import { Layer } from "./types/layer.js";

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
   * Flag to automatically take over keyboard events
   */
  auto: boolean;
} | null>(null);
