# Test patterns

Reference examples for writing tests in `ink-cartridge`. All tests use `node` environment via `ink-testing-library`.

## Good test (covers edge cases and failures)

```ts
describe('NumberInput', () => {
  it('does not go below min', async () => {
    const onChange = vi.fn();
    renderNumberInput({ value: 0, min: 0, onChange });
    await pressKey('down');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('handles NaN value gracefully', async () => {
    const onChange = vi.fn();
    renderNumberInput({ value: NaN, onChange });
    await pressKey('up');
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
```

## Bad test (tests framework, not behavior)

```ts
test('increments value', () => {
  const { result } = renderHook(() => useState(0));
  act(() => result.current[1](1));
  expect(result.current[0]).toBe(1);
});
// This tests nothing about the component — just that useState works.
```

## Mock useInput (legacy *.test.tsx)

For tests in `src/__tests__/` that still use jsdom, mock `useInput` to capture the handler:

```tsx
vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useInput: (handler) => { capturedInputHandler = handler; },
  };
});

// Dispatch a key press
act(() => pressKey('s', {}));
```

## Ink component test (ink-testing-library)

```tsx
import { render } from 'ink-testing-library';
import React from 'react';
import { Text } from 'ink';

function Greeting({ name }: { name: string }) {
  return <Text>Hello {name}</Text>;
}

const { lastFrame, stdin, unmount } = render(<Greeting name="World" />);
expect(lastFrame()).toContain('Hello World');
```

## Default component registration

```tsx
registerComponent(Menu, {});
registerComponent(Game, {}, { parent: Menu });
```
