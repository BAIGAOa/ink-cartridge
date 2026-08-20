# @cartridge-engine/i18n

## 1.0.0

### Major Changes

- 1531d6c: - **fix**(screen): `skip()` to the current screen now works, making `onlyAttribute` functional. Passing `{ onlyAttribute: true }` refreshes the current screen's props without remounting it (internal state and mouse regionFocus survive); the default remounts it with the new props. Previously the target was always rejected as "not a child", so the option was dead code.
  - **breaking**(packages): the i18n, theme, event, and init subsystems moved out of core into standalone `@cartridge-engine/i18n` / `@cartridge-engine/theme` / `@cartridge-engine/event` / `@cartridge-engine/init` packages. `ink-cartridge` no longer re-exports them — import from the new packages on demand. The single `ink-cartridge` CLI is replaced by per-command bins: `make-language-type`, `make-theme-type`, `init-theme`, `ink-cartridge-init`.
