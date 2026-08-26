---
"ink-cartridge": patch
"@cartridge-engine/keyboard-engine": patch
---

- **fix**(keyboard-engine): correct misspelled public type names — `CompositioKey` is now `CompositionKey`, `CompositionPneding` is now `CompositionPending`, and the `TComponet` generic parameter on `CompositionKey`/`MappingKeyEntry`/`PrimitiveTypeKeys` is now `TComponent`
- **fix**(ink-cartridge): re-export the corrected `CompositionKey` type
