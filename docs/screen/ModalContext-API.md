# ModalContext

React context that provides the current modal's unique ID. Consumed by `useKeyboard` internally to isolate keyboard layers per modal instance — enabling multiple instances of the same component as different modals.

## Signature

```ts
const ModalContext = createContext<{
  id: string;
  originComponent?: React.ComponentType<any>;
} | null>(null)
```

## Usage

Read it when you need the modal's ID for programmatic control:

```tsx
function ConsoleModal() {
  const modalCtx = useContext(ModalContext);

  const { closeModal } = useScreenSystem();

  useEffect(() => {
    return boundSequence(['c', 'c'], () => {
      if (modalCtx) closeModal(modalCtx.id);
    });
  }, [modalCtx]);
}
```

In most cases you will NOT need to read this directly — `useKeyboard` handles it automatically.

`originComponent` is set only for persistent modals — it tracks which screen opened the modal and enables automatic keyboard layer push/pop as the user navigates between screens.
