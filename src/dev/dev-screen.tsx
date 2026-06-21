import React from "react";
import { Box, Text } from "ink";
import { useScreenSystem } from "../screen/hook.js";
import { DevProps } from "./types.js";


// Dev Tool for developers to debug
// It is still under development.
// @2026-06-21 3.6.1
export function DevScreen({top, left}: DevProps){
  const {currentPath} = useScreenSystem()

  return(
    <Box
      borderColor='blue'
      borderStyle='round'
      position="absolute"
      top={top}
      left={left}
      height={30}
      width='100%'
      flexDirection="row"
    >
      <Box
        width='100%'
        flexDirection="column"
      >
        {
          currentPath.map(each => {
            return (
              <Text bold color='yellow'>
                {each.displayName ?? "NONE"}
              </Text>
            )
          })
        }
      </Box>
    </Box>
  )
}
