---
"ink-cartridge": patch
---

- **feat**(screen): `registerComponent` template is now optional and defaults to `{}` when omitted
- **feat**(screen): `skip`/`gotoScreen` params are now optional when the target screen declares no required props, so `skip(Child)` compiles for prop-less screens while required props still demand params
