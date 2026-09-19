---
"@cartridge-engine/keyboard-engine": patch
---

- **docs**(keyboard-engine): the `penetration` JSDoc no longer claims that a penetrated key passes through a stop rule — a key that is both penetrated and stopped on the same layer is stopped there, `stop` taking priority over penetration. The `stop` JSDoc now states the same precedence, and the two methods cross-reference each other.
