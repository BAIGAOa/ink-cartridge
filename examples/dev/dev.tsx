import React, { useContext, useEffect, useRef } from 'react';
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
} from '../../src/index.js';
import { openDevTool } from '../../src/dev/entrance.js';


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
      // Do not release ctrl + d , Because we want the settings interface to naturally use the development panel as well.
      // But the best practice is to use the globalKeys API override
    }

  }, []);
  return (
    <Box flexDirection="column" height={rows} width='100%'>
      <Text bold>Main Menu</Text>
      <Text>[S] Start Game  [O] Settings</Text>
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
  const { globalKeys } = useKeyboard()

  useEffect(() => {
    globalKeys([
      {
        key: ['ctrl+e'],
        operate: () => process.exit(0),
        category: '*',
        times: 2
      },
      {
        key: ['ctrl+r'],
        operate: () => { },
        category: '*',
        affectOverlay: true,
      },
      {
        key: ['f1'],
        operate: () => { },
        category: [Menu],
        executeWhenNoOverlay: true,
      },
      {
        key: ['ctrl+w', 'ctrl+q'],
        operate: () => { },
        category: '*',
        times: 3,
        affectOverlay: true,
      },
      {
        key: 'tab',
        operate: () => { },
        category: [],
        cover: false,
      },
    ])
  }, [])

  return null
}

registerComponent(Console, { top: 0, left: 0 })

function App() {
  return (
    <KeyboardProvider>
      <Box flexDirection="column">
        <GlobalKeys />
        <CurrentScreen />
      </Box>
    </KeyboardProvider>
  );
}

render(
  <ScenarioManagementProvider defaultScreen={Menu}>
    <App />
  </ScenarioManagementProvider>,
);
