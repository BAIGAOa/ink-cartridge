---
"blots-editor": patch
---

- **perf**(`blots-editor`): significantly faster editing and rendering for large files — soft-wrap segments are now cached per line (invalidated only by real edits or an actual wrap-width change, rebuilt lazily), and a prefix-sum index answers visual-line queries (`visualLineAt`, `cursorVisualLine`, `visualLineCount`) in O(log n)/O(1) instead of rescanning every line each frame. `setWrapWidth` no longer invalidates when the measured width is unchanged, so ordinary re-renders keep the cache intact.
- **test**(`blots-editor`): `document-cache.test.ts` covers the new cache — edits and wrap-width changes invalidate it, unchanged re-queries reuse it, and prefix-sum visual-line mapping stays correct.
