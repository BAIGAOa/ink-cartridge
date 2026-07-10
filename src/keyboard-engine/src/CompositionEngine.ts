export interface CompositionContext<T = unknown> {
  /**
   * The value currently passed through the context
   */
  value: T;

  /**
   * The flag of the previous key. If it is, it represents the head key.
   */
  lastFlag: string | null;

  /**
   * Keys that have been executed in the current sequence
   */
  steps: string[];
}

export interface CompositioKey<TComponet = unknown> {
  /**
   * Trigger key names, such as a, B, C, or even the number 3
   */
  key: string;

  /**
   * Declare what this key is.
   * This will help the following key to recognize the preceding key, which is used to determine what
   * If the flag is not already registered, it will be automatically registered.
   */
  flag: string;

  /**
   * What type of key is expected to precede
   * If the preceding type does not match, the key is discarded
   */
  needs: string[];

  /**
   * Declare whether the dependent preceding flag is optional, and if so, the key is automatically executed if it is a head key
   * It should be noted that if it is not the head key, the front type will also be checked.
   */
  optional?: boolean;

  /**
   * This key is restricted to only certain screens, and if it is a wildcard, it means that it will work on all screens.
   */
  category?: TComponet[] | "*";

  /**
   * Does it affect the floating layer
   */
  affectOverlay?: boolean;

  /**
   * What is the timeout for pressing a key
   */
  timeout?: number;
}

export default class CompositionEngine<TComponet = unknown> {
  private currentKey: string[];
  private keyMappingTable: Map<string>;

  constructor() {}

  synchronizingKey(eventName: string[]) {
    this.currentKey = eventName;
  }
}
