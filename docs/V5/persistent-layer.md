## 5.0.1 — Smart Persistent Layer and Modal Layer

### Concepts

#### Cross-page

A layer or modal layer that, once enabled, does not disappear when the page switches — it remains floating on top of the screen.

#### Host page

The `page` on which a persistent layer or persistent modal layer is opened. That `page` is the host page of the layer or modal layer.

### How to enable

This feature can be enabled through any of the following methods. "hook" denotes module-level methods; "context" denotes methods dispatched through `useScreenSystem`.

| type    | method         |
| ------- | -------------- |
| hook    | openLayer      |
| hook    | openModalLayer |
| context | openLayer      |
| context | openModalLayer |

All four methods enable the feature through the function parameter `options`. For example:

```typescript
openLayer("layer-1", 1, { crossPage: true, automaticTakeoverKeyboard: true });
```

The `crossPage` option enables the visual **cross-page** effect. It takes effect only when explicitly declared as `true`. When `skip`, `gotoScreen`, or `back` is invoked, all `layer`s without the `crossPage` option enabled are cleaned up automatically. All active bindings inside a `crossPage`-enabled `layer` remain responsive after page navigation.

The `automaticTakeoverKeyboard` option enables the smart keyboard takeover system. It takes effect only when explicitly declared as `true`. Once enabled, when this `layer` leaves its **host page** due to `skip`, `gotoScreen`, or similar methods, its keyboard is automatically deactivated; conversely, when it returns to the host page, its keyboard responses are reactivated. This automatically avoids potential conflicts without the need to write convoluted conditional checks.
