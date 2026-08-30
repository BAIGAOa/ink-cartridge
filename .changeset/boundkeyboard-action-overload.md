---
"ink-cartridge": patch
---

- **fix**(keyboard): `boundKeyboard(actionId, options?)` no longer crashes when called with only the action id — the React hook's action-id overload read `handlerOrOptions.ref` / `handlerOrOptions.focusId` without optional chaining, throwing `Cannot read properties of undefined (reading 'ref')` on single-argument calls. The branch now guards the options object the same way `boundSequence`'s overload does.
