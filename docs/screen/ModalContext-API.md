# ModalContext

React context that provides the current modal's unique ID. Consumed by `useKeyboard` internally to isolate keyboard layers per modal instance — enabling multiple instances of the same component as different modals.

## Signature

```ts
const ModalContext = createContext<string | null>(null)
```

## Usage

Read it when you need the modal's ID for programmatic control:

```tsx
function ConsoleModal() {
  const modalId = useContext(ModalContext);

  const { closeModal } = useScreenSystem();

  useEffect(() => {
    return boundSequence(['c', 'c'], () => {
      if (modalId) closeModal(modalId);
    });
  }, [modalId]);
}
```

In most cases you will NOT need to read this directly — `useKeyboard` handles it automatically.
