import React, { useContext, useEffect, useRef, useState } from 'react';
import { render, Box, Text, useWindowSize } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  useKeyboard,
  KeyboardProvider,
  closeOverlay,
  openOverlay,
  useScreenSystem,
  ModalContext,
  openModal,
  createEventBus,
  EventProvider,
  useEmitter,
  useSubscribe,
} from '../../src/index.js';
import { openDevTool } from '../../src/dev/entrance.js';

// Event map for cross-component communication via the event bus.
interface AppEvents {
  SHOW_NOTIFICATION: { text: string };
  CLEAR_NOTIFICATION: void;
}

const bus = createEventBus<AppEvents>();


// Registered screens for the navigation demo.
// DevScreen tracks the screen navigation path in real time.

function Menu() {
  const { skip } = useScreenSystem()
  const { boundKeyboard, stop, boundSequence } = useKeyboard();
  const { rows } = useWindowSize()
  const gameOpenRef = useRef(false)

  useEffect(() => {
    const s1 = stop(['q']);
    // Ctrl+D opens DevScreen modal. Since modals block external keys,
    // the Escape key inside DevScreen handles closing. openDevTool
    // throws if already open — the try/catch in closeDevTool makes
    // stale refs harmless, and openDevTool itself guards against duplicates.
    const u1 = boundKeyboard(['ctrl+d'], () => openDevTool({ top: 0, left: 0 }));
    const u2 = boundKeyboard(['s'], () => {
      if (gameOpenRef.current) {
        closeOverlay('console')
        gameOpenRef.current = false
      } else {
        openOverlay('console', Console, {
          top: 10,
          left: 0
        }, {
          activate: false
        })
        gameOpenRef.current = true
      }
    })
    const u3 = boundKeyboard(['1'], () => skip(Scene1, {}))
    boundSequence(['d', 'v'], () => skip(Setting, {}), {})
    boundSequence(['d', 'c'], () => {
      openModal('console', ConsoleModal, {
        top: 30,
        left: 0
      })
    })
    return () => {
      s1()
      u2()
      u3()
      // Do not release ctrl + d , Because we want the settings interface to naturally use the development panel as well.
      // But the best practice is to use the globalKeys API override
    }

  }, []);
  return (
    <Box flexDirection="column" height={rows} width='100%'>
      <Text bold>Main Menu</Text>
      <Text>[1] Scene1 (Global Sequence Disambiguation)  [S] Start Game  [O] Settings</Text>
      <Text dimColor>[Ctrl+D] Toggle Dev Panel</Text>
    </Box>
  );
}
registerComponent(Menu, {});


function ConsoleModal({top, left}: {top: number, left: number}) {
  const { boundSequence, allowModal } = useKeyboard()
  const { closeModal } = useScreenSystem()
  const modalId = useContext(ModalContext)
  useEffect(() => {
    const sAllow = allowModal(['d'])

    return () => {
      sAllow()
    }
  }, [])

  useEffect(() => {
    const uClose = boundSequence(['c', 'c'], () => {
      if (modalId) {
        closeModal(modalId)
      }
    })

    return () => {
      uClose()
    }

  }, [])

  return (
    <Box
      position='absolute'
      top={top}
      left={left}
      borderStyle='round'
      borderColor='magenta'
      alignItems='center'
      justifyContent='center'
      height={30}
      width='100%'
    >
      <Text bold color='cyan'>
        YOU OPEN THE CONSOLE
      </Text>
    </Box>
  )
}
registerComponent(ConsoleModal, {top: 0, left: 0})

function Setting() {
  const { rows } = useWindowSize()
  const { boundKeyboard } = useKeyboard()
  const { back } = useScreenSystem()

  useEffect(() => {
    const u1 = boundKeyboard(['escape'], () => back())

    return () => u1()
  }, [])

  return (
    <Box
      height={rows}
      width='100%'
      justifyContent='center'
      alignContent='center'
    >
      <Text bold color='yellow'>
        HI YOU OPEN THE SETTING
      </Text>
    </Box>
  )
}

registerComponent(Setting, {}, {
  parent: Menu
})


function Scene1(){
  const { rows } = useWindowSize()
  const { back } = useScreenSystem()
  const { globalSequence, boundKeyboard } = useKeyboard()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // Two global sequences sharing the same first key 'g' —
    // the disambiguation mechanism picks the right one based
    // on the second key pressed.
    globalSequence([
      { keys: ['g', 'g'], operate: () => setMessage('YOU PRESS GG') },
      { keys: ['g', 'b'], operate: () => setMessage('YOU PRESS GB') },
    ])
    // globalSequence returns void — clear on unmount with empty array.

    const uBack = boundKeyboard(['escape'], () => back())
    
    return () => {
      globalSequence([])
      uBack()
    }
  }, [])

  return(
    <Box
      borderStyle='bold'
      borderColor='cyan'
      height={rows}
      width='100%'
      justifyContent='center'
      alignItems='center'
      flexDirection='column'
    >
      <Text bold color='cyan'>Scene1 — Global Sequence Disambiguation</Text>
      <Text dimColor>Press [g, g] or [g, b]</Text>
      {message && (
        <Box marginTop={1} borderStyle='round' borderColor='green' paddingX={2}>
          <Text bold color='green'>{message}</Text>
        </Box>
      )}
    </Box>
  )
}

registerComponent(Scene1, {}, { parent: Menu })


function Console({ top, left }: { top: number, left: number }) {
  return (
    <Box
      borderStyle='bold'
      borderColor='magenta'
      height={10}
      width='100%'
      position='absolute'
      top={top}
      left={left}
      justifyContent='center'
    >
      <Text bold color='yellow'>YOU OPEN THE CONSOLE</Text>
    </Box>
  )
}


function GlobalKeys() {
  const { globalKeys } = useKeyboard();
  const emitShowNotification = useEmitter('SHOW_NOTIFICATION');
  const emitClearNotification = useEmitter('CLEAR_NOTIFICATION');

  useEffect(() => {
    globalKeys([
      {
        key: ['ctrl+e'],
        operate: () => process.exit(0),
        category: '*',
        times: 2,
      },
      {
        key: ['ctrl+r'],
        operate: () => {},
        category: '*',
        affectOverlay: true,
      },
      {
        key: ['f1'],
        operate: () => {},
        category: [Menu],
        executeWhenNoOverlay: true,
      },
      {
        key: ['ctrl+w', 'ctrl+q'],
        operate: () => {},
        category: '*',
        times: 3,
        affectOverlay: true,
      },
      {
        key: 'tab',
        operate: () => {},
        category: [],
        cover: false,
      },
      // Event-driven examples — emit events instead of inlining logic.
      {
        key: ['ctrl+n'],
        operate: () => emitShowNotification({ text: 'Hello from GlobalKeys!' }),
        category: '*',
      },
      {
        key: ['ctrl+x'],
        operate: () => { emitClearNotification(undefined); },
        category: '*',
      },
    ]);
  }, []);

  return null;
}

registerComponent(Console, { top: 0, left: 0 });

/**
 * Subscribes to event bus notifications and displays them.
 *
 * Demonstrates cross-component communication: GlobalKeys emits events
 * via the event bus, and NotificationBar (in a completely different
 * part of the tree) subscribes and reacts — with zero prop drilling.
 */
function NotificationBar() {
  const [message, setMessage] = useState<string | null>(null);

  useSubscribe('SHOW_NOTIFICATION', ({ text }: { text: string }) => {
    setMessage(text);
  });

  useSubscribe('CLEAR_NOTIFICATION', () => {
    setMessage(null);
  });

  if (!message) return null;

  return (
    <Box marginY={1} borderStyle="round" borderColor="green" paddingX={2}>
      <Text bold color="green">
        {message}
      </Text>
    </Box>
  );
}

function App() {
  return (
    <KeyboardProvider>
      <Box flexDirection="column">
        <GlobalKeys />
        <NotificationBar />
        <CurrentScreen />
      </Box>
    </KeyboardProvider>
  );
}

render(
  <ScenarioManagementProvider defaultScreen={Menu}>
    <EventProvider bus={bus}>
      <App />
    </EventProvider>
  </ScenarioManagementProvider>,
);
