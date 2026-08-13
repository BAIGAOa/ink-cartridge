---
"blots-editor": patch
---

- Restore the floating toolbar's drag behavior: the bar starts bottom-center and follows the cursor with a grab offset, clamped to the terminal (below the information bar and left of the file tree when open)
- Make file-tree scanning asynchronous: the pane shows "Scanning..." while the root is being read and "Scan failed" when the directory is unreadable
- Localize the remaining file-tree strings ("Scanning...", "No directory", "Scan failed", "Unsaved changes") in the English and Chinese language packs
- Reorganize editor sources into `core/io`, `view/page`, `view/editor`, `view/utils`, and `utils/view` modules
- Update tests for the new module layout and async scan API, and isolate them from the user's real settings file
