// xterm-mouse — fork of the npm package `xterm-mouse` (MIT). The upstream
// library is already modular (a `Mouse` facade over focused services); we
// fixed bugs in the fork and integrated it into the keyboard engine. The
// unmodified upstream source is kept at `core/Mouse.original.ts` for
// reference.
// Upstream: https://www.npmjs.com/package/xterm-mouse
// @2026-08-10 v5.1.6
export { Mouse } from './core/Mouse.js';
export type {
  MouseEvent,
  MouseEventAction,
  MouseOptions,
  MousePosition,
  MouseStreamEvent,
  ReadableStreamWithEncoding,
} from './types/index.js';
export { MouseError } from './types/index.js';
