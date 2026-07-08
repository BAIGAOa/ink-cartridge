# Skills

Project-specific workflow skills for ink-cartridge. Each skill is a Claude Code custom skill — a markdown file with instructions that teach the AI how to perform a specific task following project conventions.

## Skills

| Skill | Purpose |
|-------|---------|
| [write-test](write-test/SKILL.md) | Write tests following project conventions |
| [write-docs](write-docs/SKILL.md) | Write, update, sync, or fix documentation |
| [write-example](write-example/SKILL.md) | Write demo/example files for ink-cartridge components and APIs |

## Format

Each skill is a `SKILL.md` file under its own directory with YAML frontmatter (`name`, `description`). Skills are invoked via `/skill-name` or natural language triggers.
