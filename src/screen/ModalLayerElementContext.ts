import React, { createContext } from "react";
import { ModalLayer } from "./types/layer.js";

export const ModalLayerElementContext = createContext<{
  /** This field indicates the ID of this Element. */
  id: string;
  /**
   * This field indicates which layer this Element belongs to.
   */
  modalLayer: ModalLayer;
  /**
   * Host page of the current layer
   */
  hostPage: React.ComponentType<any> | null;
  /**
   * Flag to automatically take over keyboard events
   */
  auto: boolean;
} | null>(null);
