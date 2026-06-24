import { Box } from "ink";
import React from "react";

// This modal box is used to display information about all registered global keys.
// Because it is a modal box, its keyboard is independent and will not be affected by DevTool.
// Also make sure that the zindex is greater than the zindex of the DevTool so that the visual effects and keyboard reception are applied correctly when the modal box is opened


export default function GlobalKeyDisplayBox(){

  return (
    <Box
      position="absolute"
      
    >
    </Box>
  )
}
