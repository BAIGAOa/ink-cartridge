# ink-cartridge

> A component kit for rapidly building complex, multi-page, interaction-heavy terminal applications — filling the critical gaps Ink leaves open.

[![CI](https://github.com/BAIGAOa/ink-cartridge/actions/workflows/ci.yml/badge.svg)](https://github.com/BAIGAOa/ink-trc/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ink-cartridge.svg)](https://www.npmjs.com/package/ink-cartridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Design Philosophy

Ink gives you `useInput` and `render`. Everything else — screen navigation, layered keyboard events, focus management, cross-component communication — you build yourself. ink-cartridge provides all of that, designed for **multi-page, interaction-dense terminal apps** where a single global `useInput` with `if-else` chains breaks down.

Three pillars:

- **Screen as component** — Every React component is a screen. Register them into a tree, navigate with `skip` / `back` / `gotoScreen`. No hand-written conditional rendering.
- **Layered keyboard engine** — Each screen owns its key bindings. A 7-stage pipeline resolves conflicts between modals, overlays, global keys, and the screen stack. Focus system partitions keys within the same layer.
- **Event bus** — Decoupled cross-component communication. Global keys emit events; any component subscribes. Zero prop drilling.

## Documentation

<pre>
docs/
├── <a href="docs/keyboard/README.md">keyboard/</a>
│   ├── <a href="docs/keyboard/README.md">README</a>              — Architecture &amp; API index
│   ├── <a href="docs/keyboard/KeyboardProvider-API.md">KeyboardProvider</a>
│   ├── <a href="docs/keyboard/useKeyboard-API.md">useKeyboard</a>
│   ├── <a href="docs/keyboard/boundKeyboard-API.md">boundKeyboard</a>
│   ├── <a href="docs/keyboard/boundSequence-API.md">boundSequence</a>
│   ├── <a href="docs/keyboard/blockedKey-API.md">blockedKey</a>
│   ├── <a href="docs/keyboard/stop-API.md">stop</a>
│   ├── <a href="docs/keyboard/globalKeys-API.md">globalKeys</a>
│   ├── <a href="docs/keyboard/globalSequence-API.md">globalSequence</a>
│   ├── <a href="docs/keyboard/focus-system-API.md">focus system</a>
│   ├── <a href="docs/keyboard/shortcut-actions-API.md">shortcut actions</a>
│   ├── <a href="docs/keyboard/sequence-actions-API.md">sequence actions</a>
│   ├── <a href="docs/keyboard/allowModal-API.md">allowModal</a>
│   ├── <a href="docs/keyboard/useModalMissListener-API.md">useModalMissListener</a>
│   ├── <a href="docs/keyboard/enableWildcardPriority-API.md">enableWildcardPriority</a>
│   └── <a href="docs/keyboard/advanced.md">advanced</a>
│
├── <a href="docs/screen/README.md">screen/</a>
│   ├── <a href="docs/screen/README.md">README</a>                — Architecture &amp; API index
│   ├── <a href="docs/screen/registerComponent-API.md">registerComponent</a>
│   ├── <a href="docs/screen/ScenarioManagementProvider-API.md">ScenarioManagementProvider</a>
│   ├── <a href="docs/screen/CurrentScreen-API.md">CurrentScreen</a>
│   ├── <a href="docs/screen/useScreenSystem-API.md">useScreenSystem</a>
│   ├── <a href="docs/screen/skip-API.md">skip</a>
│   ├── <a href="docs/screen/back-API.md">back</a>
│   ├── <a href="docs/screen/gotoScreen-API.md">gotoScreen</a>
│   ├── <a href="docs/screen/overlay-API.md">overlay</a>
│   ├── <a href="docs/screen/modal-API.md">modal</a>
│   ├── <a href="docs/screen/ModalContext-API.md">ModalContext</a>
│   └── <a href="docs/screen/advanced.md">advanced</a>
│
├── <a href="docs/event/README.md">event/</a>
│   ├── <a href="docs/event/README.md">README</a>                 — Architecture &amp; API index
│   ├── <a href="docs/event/createEventBus-API.md">createEventBus</a>
│   ├── <a href="docs/event/EventProvider-API.md">EventProvider</a>
│   ├── <a href="docs/event/useEmitter-API.md">useEmitter</a>
│   ├── <a href="docs/event/useSubscribe-API.md">useSubscribe</a>
│   ├── <a href="docs/event/useEventBus-API.md">useEventBus</a>
│   ├── <a href="docs/event/EventBus-API.md">EventBus</a>
│   └── <a href="docs/event/advanced.md">advanced</a>
│
├── <a href="docs/components/README.md">components/</a>
│   ├── <a href="docs/components/README.md">README</a>            — Component index
│   ├── <a href="docs/components/SelectInput/SelectInput-API.md">SelectInput</a>
│   ├── <a href="docs/components/SelectRow/SelectRow-API.md">SelectRow</a>
│   ├── <a href="docs/components/MultiSelectInput/MultiSelectInput-API.md">MultiSelectInput</a>
│   ├── <a href="docs/components/TextInput/TextInput-API.md">TextInput</a>
│   ├── <a href="docs/components/TextInput/UncontrolledTextInput-API.md">UncontrolledTextInput</a>
│   ├── <a href="docs/components/NumberInput/NumberInput-API.md">NumberInput</a>
│   ├── <a href="docs/components/SearchInput/SearchInput-API.md">SearchInput</a>
│   ├── <a href="docs/components/ConfirmDialog/ConfirmDialog-API.md">ConfirmDialog</a>
│   ├── <a href="docs/components/Spinner/Spinner-API.md">Spinner</a>
│   ├── <a href="docs/components/ProgressBar/ProgressBar-API.md">ProgressBar</a>
│   ├── <a href="docs/components/Divider/Divider-API.md">Divider</a>
│   ├── <a href="docs/components/Badge/Badge-API.md">Badge</a>
│   ├── <a href="docs/components/KeyHint/KeyHint-API.md">KeyHint</a>
│   ├── <a href="docs/components/Tabs/Tabs-API.md">Tabs</a>
│   ├── <a href="docs/components/Fold/Fold-API.md">Fold</a>
│   ├── <a href="docs/components/Form/Form-API.md">Form</a>
│   ├── <a href="docs/components/Form/Field-API.md">Field</a>
│   └── <a href="docs/components/Form/useFormContext-API.md">useFormContext</a>
│
├── <a href="docs/theme/README.md">theme/</a>
│   ├── <a href="docs/theme/README.md">README</a>
│   ├── <a href="docs/theme/ThemeProvider-API.md">ThemeProvider</a>
│   ├── <a href="docs/theme/useTheme-API.md">useTheme</a>
│   └── <a href="docs/theme/advanced.md">advanced</a>
│
├── <a href="docs/language/README.md">language/</a>
│   ├── <a href="docs/language/README.md">README</a>
│   ├── <a href="docs/language/LanguageProvider-API.md">LanguageProvider</a>
│   ├── <a href="docs/language/useI18n-API.md">useI18n</a>
│   └── <a href="docs/language/advanced.md">advanced</a>
│
├── <a href="docs/storage/README.md">storage/</a>
│   ├── <a href="docs/storage/README.md">README</a>
│   └── <a href="docs/storage/createStorage-API.md">createStorage</a>
│
├── <a href="docs/binary-storage/README.md">binary-storage/</a>
│   ├── <a href="docs/binary-storage/README.md">README</a>
│   ├── <a href="docs/binary-storage/createBinaryStorage-API.md">createBinaryStorage</a>
│   └── <a href="docs/binary-storage/createStreamingReader-API.md">createStreamingReader</a>
│
└── <a href="docs/dev-tool/README.md">dev-tool/</a>
    ├── <a href="docs/dev-tool/README.md">README</a>
    ├── <a href="docs/dev-tool/openDevTool-API.md">openDevTool</a>
    └── <a href="docs/dev-tool/closeDevTool-API.md">closeDevTool</a>
</pre>

## Install

```bash
npm install ink-cartridge
```

## Scaffold

```bash
npx ink-cartridge init my-tui
```

## Other

The method `blockedKey` is poorly named — it means *pass-through*, not "block." The internal name is `penetration`. Too late to rename now.

## License

[MIT](LICENSE)