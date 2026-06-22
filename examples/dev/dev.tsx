import React, { useEffect, useRef } from 'react';
import { render, Box, Text, useWindowSize } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  useKeyboard,
  KeyboardProvider,
  closeOverlay,
  openOverlay,
} from '../../src/index.js';
import { openDevTool } from '../../src/dev/entrance.js';


// Registered screens for the navigation demo.
// DevScreen tracks the screen navigation path in real time.

function Menu() {
  const { boundKeyboard, stop } = useKeyboard();
  const {rows} = useWindowSize()
  const gameOpenRef = useRef(false)

  useEffect(() => {
    stop(['q']);
    // Ctrl+D opens DevScreen modal. Since modals block external keys,
    // the Escape key inside DevScreen handles closing. openDevTool
    // throws if already open — the try/catch in closeDevTool makes
    // stale refs harmless, and openDevTool itself guards against duplicates.
    boundKeyboard(['ctrl+d'], () => openDevTool({top: 0, left: 0}));
    boundKeyboard(['s'], () => {
      if(gameOpenRef.current){
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


function Console({top, left}: {top: number, left:number}){
  return(
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

registerComponent(Console, {top: 0, left: 0})

function App() {
  return (
    <KeyboardProvider>
      <Box flexDirection="column">
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
