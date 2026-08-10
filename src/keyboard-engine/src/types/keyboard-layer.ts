/**
 * Layer data required by the keyboard engine.
 *
 * Host frameworks extend this type for their own layer implementations.
 */
export interface KeyboardLayer {
  /**
   * The ID of this layer; must be unique among all layers.
   */
  layerId: string;
  /**
   * All elements currently on this layer. The keyboard system creates
   * separate keyboard data for each of them.
   */
  elements: string[];

  /**
   * The subset of `elements` that currently receive keyboard and mouse
   * events; inactive elements are skipped.
   */
  activeElements: string[];
}
