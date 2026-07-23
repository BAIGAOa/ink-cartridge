/**
 * Custom error class for errors that occur within the Mouse class.
 * This allows for more specific error handling and preserves the original error.
 */
export class MouseError extends Error {
  /**
   * @param message The error message.
   * @param originalError The original error, if any.
   */
  constructor(
    message: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'MouseError';
  }
}
