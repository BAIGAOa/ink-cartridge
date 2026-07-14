<div align="center">
        <br>
        <br>
        <img width="440" alt="cartridge" src="static/cartridge.png">
        <br>
        <br>
        <br>					 
</div>

<h1 align="center">Cartridge</h1>

>A component kit for rapidly building complex, multi-page, interaction-heavy terminal applications — filling the critical gaps Ink leaves open.

[![CI](https://github.com/BAIGAOa/ink-cartridge/actions/workflows/ci.yml/badge.svg)](https://github.com/BAIGAOa/ink-trc/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ink-cartridge.svg)](https://www.npmjs.com/package/ink-cartridge)
[![npm version](https://img.shields.io/npm/v/@cartridge-engine/keyboard-engine.svg?label=keyboard-engine)](https://www.npmjs.com/package/@cartridge-engine/keyboard-engine)
[![coverage](https://img.shields.io/badge/coverage-90%25-brightgreen)](https://github.com/BAIGAOa/ink-cartridge)
[![coverage](https://img.shields.io/badge/keyboard--engine%20coverage-90%25-brightgreen)](https://github.com/BAIGAOa/ink-cartridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Installation](#installation)
- [Scaffold](#scaffold)
- [Documentation](#documentation)
- [For AI](#for-ai)
- [Other](#other)
- [License](#license)

## Design Philosophy

Ink gives you `useInput` and `render`. Everything else — screen navigation, layered keyboard events, focus management, cross-component communication — you build yourself. ink-cartridge provides all of that, designed for **multi-page, interaction-dense terminal apps** where a single global `useInput` with `if-else` chains breaks down.

TWO pillars:

- **Screen as component** — Every React component is a screen. Register them into a tree, navigate with `skip` / `back` / `gotoScreen`. No hand-written conditional rendering.
- **Layered keyboard engine** — Each screen owns its key bindings. A 9-stage pipeline resolves conflicts between modals, overlays, global keys, and the screen stack. Focus system partitions keys within the same layer.


## Installation

```bash
npm install ink-cartridge
```

## Scaffold

```bash
npx ink-cartridge init my-tui
```

## Install the keyboard engine

```bash
npm install @cartridge-engine/keyboard-engine
```


## Documentation

<details>
<summary><b>keyboard/</b> — Architecture &amp; API index</summary>

- [README](docs/keyboard/README.md) — Architecture &amp; API index
- [KeyboardProvider](docs/keyboard/KeyboardProvider-API.md)
- [useKeyboard](docs/keyboard/useKeyboard-API.md)
- [boundKeyboard](docs/keyboard/boundKeyboard-API.md)
- [boundSequence](docs/keyboard/boundSequence-API.md)
- [penetration](docs/keyboard/penetration-API.md)
- [stop](docs/keyboard/stop-API.md)
- [compositionEngine](docs/keyboard/compositionEngine-API.md)
- [setValueSchema](docs/keyboard/setValueSchema-API.md)
- [globalKeys](docs/keyboard/globalKeys-API.md)
- [globalSequence](docs/keyboard/globalSequence-API.md)
- [focus system](docs/keyboard/focus-system-API.md)
- [shortcut actions](docs/keyboard/shortcut-actions-API.md)
- [sequence actions](docs/keyboard/sequence-actions-API.md)
- [allowModal](docs/keyboard/allowModal-API.md)
- [useModalMissListener](docs/keyboard/useModalMissListener-API.md)
- [enableWildcardPriority](docs/keyboard/enableWildcardPriority-API.md)
- [isNormalCharacter](docs/keyboard/isNormalCharacter-API.md)
- [Mode System](docs/keyboard/mode-system-API.md)
- [Condition System](docs/keyboard/condition-system-API.md)
- [addProcessor](docs/keyboard/addProcessor-API.md)
- [removeProcessor](docs/keyboard/removeProcessor-API.md)
- [thereGlobalQueueWaiting](docs/keyboard/thereGlobalQueueWaiting-API.md)
- [currentScreenHasSequenceWaiting](docs/keyboard/currentScreenHasSequenceWaiting-API.md)
- [advanced](docs/keyboard/advanced.md)
</details>

<details>
<summary><b>screen/</b> — Architecture &amp; API index</summary>

- [README](docs/screen/README.md) — Architecture &amp; API index
- [registerComponent](docs/screen/registerComponent-API.md)
- [ScenarioManagementProvider](docs/screen/ScenarioManagementProvider-API.md)
- [CurrentScreen](docs/screen/CurrentScreen-API.md)
- [useScreenSystem](docs/screen/useScreenSystem-API.md)
- [skip](docs/screen/skip-API.md)
- [back](docs/screen/back-API.md)
- [gotoScreen](docs/screen/gotoScreen-API.md)
- [overlay](docs/screen/overlay-API.md)
- [modal](docs/screen/modal-API.md)
- [ModalContext](docs/screen/ModalContext-API.md)
- [advanced](docs/screen/advanced.md)
</details>

<details>
<summary><b>event/</b> — Architecture &amp; API index</summary>

- [README](docs/event/README.md) — Architecture &amp; API index
- [createEventBus](docs/event/createEventBus-API.md)
- [EventProvider](docs/event/EventProvider-API.md)
- [useEmitter](docs/event/useEmitter-API.md)
- [useSubscribe](docs/event/useSubscribe-API.md)
- [useEventBus](docs/event/useEventBus-API.md)
- [EventBus](docs/event/EventBus-API.md)
- [advanced](docs/event/advanced.md)
</details>

<details>
<summary><b>components/</b> — Component index</summary>

- [README](docs/components/README.md) — Component index
- [SelectInput](docs/components/SelectInput/SelectInput-API.md)
- [SelectRow](docs/components/SelectRow/SelectRow-API.md)
- [MultiSelectInput](docs/components/MultiSelectInput/MultiSelectInput-API.md)
- [TextInput](docs/components/TextInput/TextInput-API.md)
- [UncontrolledTextInput](docs/components/TextInput/UncontrolledTextInput-API.md)
- [NumberInput](docs/components/NumberInput/NumberInput-API.md)
- [SearchBar](docs/components/SearchBar/SearchBar-API.md)
- [SearchInput](docs/components/SearchInput/SearchInput-API.md)
- [ConfirmDialog](docs/components/ConfirmDialog/ConfirmDialog-API.md)
- [Spinner](docs/components/Spinner/Spinner-API.md)
- [ProgressBar](docs/components/ProgressBar/ProgressBar-API.md)
- [Divider](docs/components/Divider/Divider-API.md)
- [Badge](docs/components/Badge/Badge-API.md)
- [KeyHint](docs/components/KeyHint/KeyHint-API.md)
- [Tabs](docs/components/Tabs/Tabs-API.md)
- [Fold](docs/components/Fold/Fold-API.md)
- [Form](docs/components/Form/Form-API.md)
- [Field](docs/components/Form/Field-API.md)
- [useFormContext](docs/components/Form/useFormContext-API.md)
</details>

<details>
<summary><b>theme/</b></summary>

- [README](docs/theme/README.md)
- [ThemeProvider](docs/theme/ThemeProvider-API.md)
- [useTheme](docs/theme/useTheme-API.md)
- [advanced](docs/theme/advanced.md)
</details>

<details>
<summary><b>language/</b></summary>

- [README](docs/language/README.md)
- [LanguageProvider](docs/language/LanguageProvider-API.md)
- [useI18n](docs/language/useI18n-API.md)
- [advanced](docs/language/advanced.md)
</details>

<details>
<summary><b>dev-tool/</b></summary>

- [README](docs/dev-tool/README.md)
- [openDevTool](docs/dev-tool/openDevTool-API.md)
- [closeDevTool](docs/dev-tool/closeDevTool-API.md)
</details>

<details>
<summary><b>cli/</b></summary>

- [README](docs/cli/README.md) — CLI commands: init, initTheme, makeLanguageType, makeThemeType
</details>

## For AI

We actively support human-AI collaborative development — AI writes, humans lead and review. Every AI-generated change must be understood, verified, and signed off by a person.

The project ships with specifications and workflows purpose-built for AI coding agents:

- **[AGENTS.md](AGENTS.md)** — project conventions: stack, architecture, coding rules, testing principles
- **[agents/rules/](agents/rules/)** — conditional rules auto-loaded by file path (testing, components, public API, comments, examples)
- **[skills/](skills/README.md)** — custom AI skills for project-specific workflows (`write-test`, `write-docs`)

See also [docs-agents/](docs-agents/) for agent reference material (test patterns, coding patterns, React guidelines, comment conventions).

**This does not mean that we will maintain unlimited tolerance for the code produced by AI. Like many projects, we do not accept the junk code produced by AI.**

## Examples

Runnable demos for every component. See [examples/README.md](examples/README.md) for the full list and run commands.

## License

[MIT](LICENSE)
