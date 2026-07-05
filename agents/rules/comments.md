---
name: comments
description: Comments and documentation must be written in English. No Chinese or other languages in code comments, UI strings, or documentation.
paths: ["src/**/*", "tests/**/*", "examples/**/*", "docs/**/*", "docs-agents/**/*", "agents/**/*", "*.md"]
---

## English-only

All comments, JSDoc, UI strings, log messages, error messages, and documentation must be written in English.

This includes:
- Single-line and multi-line comments
- JSDoc descriptions, `@param`, `@returns`, `@throws`, `@example` tags
- Terminal UI strings (component labels, placeholders, help text)
- Error and warning messages
- README and documentation files

**Why:** The project is public-facing and English ensures accessibility for all contributors and users. Chinese comments in historically Chinese-authored files create inconsistency and exclude non-Chinese-speaking contributors.

## Exceptions

- `examples/i18n/locales/zh-CN.json` — i18n locale data, intentionally Chinese
- Commit messages — not governed by this rule (use project convention)
