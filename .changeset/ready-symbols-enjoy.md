---
"blots-editor": patch
---

## blots-editor (packages/editor)

### Patch / Fix

- **fix**: Add `#!/usr/bin/env node` shebang to the CLI entry — after a global install, the `blots-editor` command runs under Node correctly instead of being opened by the OS's `.js` file association (e.g. VS Code opening `dist/index.js` on Windows).
