import React from "react";
import { RegionFocusMap } from "./region-focus.js";

export type Page = {
  component: React.ComponentType<any>;
  /**
   * Map of mouse-region refs on this page to the keyboard focus each drives.
   * Persisted in the navigation state so it survives re-renders.
   */
  regionFocus: RegionFocusMap;
};
