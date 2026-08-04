// xterm-mouse — fork of the npm package `xterm-mouse` (MIT), refactored into
// a facade (`core/Mouse.ts`) + focused services. The unmodified upstream
// source is kept at `core/Mouse.original.ts` for reference.
// Upstream: https://www.npmjs.com/package/xterm-mouse
export { Mouse } from './core/Mouse.js';
export type { MouseEvent, MouseEventAction, MouseOptions, ReadableStreamWithEncoding } from './types/index.js';
export { MouseError } from './types/index.js';
