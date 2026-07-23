/**
 * Extends NodeJS.ReadStream to include the readableEncoding property.
 *
 * This interface is used to provide type safety when accessing the encoding
 * of a readable stream. The standard NodeJS.ReadStream type does not include
 * the readableEncoding property in its type definition, so we extend it here.
 *
 * @property readableEncoding - The current encoding of the readable stream, or null if not set
 *
 * @example
 * ```ts
 * function setupStream(stream: ReadableStreamWithEncoding) {
 *   // TypeScript knows about readableEncoding
 *   const currentEncoding = stream.readableEncoding;
 *   console.log(`Stream encoding: ${currentEncoding}`);
 * }
 * ```
 */
export interface ReadableStreamWithEncoding extends NodeJS.ReadStream {
  readableEncoding: BufferEncoding | null;
}
