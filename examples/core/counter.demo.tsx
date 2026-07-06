/**
 * Counter Demo — boundKeyboard with advanced options.
 *
 * Demonstrates: boundKeyboard with once, times, when, observer.
 *
 * Controls:
 *   a — increment (+1)
 *   s — decrement (-1)
 *   r — reset to 0 (once — works exactly once then unbinds)
 *   t — add 5 (times: 3 — press 3 times to trigger, observer shows progress)
 *   d — double value (when: value is between 1 and 49)
 *
 * Run:
 *   npx tsx examples/core/counter.demo.tsx
 */
import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  useKeyboard,
  Divider,
  KeyHint,
} from '../../src/index.js';

function CounterScreen() {
  const [value, setValue] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetAvailable, setResetAvailable] = useState(true);
  const { boundKeyboard } = useKeyboard();

  React.useEffect(() => {
    // Basic binding: press 'a' to increment.
    const unbindA = boundKeyboard(['a'], () => setValue((v) => v + 1));

    // Basic binding: press 's' to decrement.
    const unbindS = boundKeyboard(['s'], () => setValue((v) => v - 1));

    // times + observer: press 't' 3 times to add 5.
    // observer fires on every press with the remaining count.
    const unbindT = boundKeyboard(['t'], () => setValue((v) => v + 5), {
      times: 3,
      observer: (r: number) => setRemaining(r),
    });

    // once: press 'r' to reset. Works exactly once, then auto-unbinds.
    const unbindR = boundKeyboard(['r'], () => {
      setValue(0);
      setResetAvailable(false);
    }, { once: true });

    // when: press 'd' to double, but only when value is 1-49.
    const unbindD = boundKeyboard(['d'], () => setValue((v) => v * 2), {
      when: () => value > 0 && value < 50,
    });

    return () => {
      unbindA(); unbindS(); unbindT(); unbindR(); unbindD();
      setRemaining(null);
    };
  }, [boundKeyboard, value]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Counter Demo — boundKeyboard Options</Text>
      <Text dimColor>a/s to change · t×3 adds 5 · r resets once · d doubles (1-49) · Press q to quit</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>
          Value: <Text color="green" bold>{value}</Text>
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          a → +1  |  s → -1
        </Text>
        <Text dimColor>
          t → +5 {remaining !== null ? `(press ${remaining} more time(s))` : '(idle)'}
        </Text>
        <Text dimColor>
          r → reset {resetAvailable ? '(available — once)' : '(used — binding auto-removed)'}
        </Text>
        <Text color={value > 0 && value < 50 ? 'green' : 'red'}>
          d → double ({value > 0 && value < 50 ? 'active' : 'inactive — value must be 1-49'})
        </Text>
      </Box>

      <Divider />
      <KeyHint keys={[
        { key: 'a/s', desc: 'Increment / Decrement' },
        { key: 't×3', desc: 'Add 5 (times)' },
        { key: 'r', desc: 'Reset (once)' },
        { key: 'd', desc: 'Double (when)' },
        { key: 'q', desc: 'Quit' },
      ]} />
    </Box>
  );
}

registerComponent(CounterScreen, {});

function App() {
  const { boundKeyboard } = useKeyboard();
  React.useEffect(() => {
    const unbind = boundKeyboard(['q'], () => process.exit(0));
    return unbind;
  }, [boundKeyboard]);
  return <CurrentScreen />;
}
registerComponent(App, {});

render(
  <ScenarioManagementProvider defaultScreen={CounterScreen} fullScreen>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
