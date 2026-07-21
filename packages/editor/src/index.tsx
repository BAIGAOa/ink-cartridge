import { Box, render } from "ink";
import React from "react";
import { InformationBar } from "./core/view/information-bar.js";
import { CurrentScreen, KeyboardProvider, registerComponent, ScenarioManagementProvider } from "ink-cartridge";

function App() {


   return <Box height='100%' width='100%'>
      <InformationBar mode="NONE"/>
   </Box>
}

registerComponent(App, {})

render(
   <ScenarioManagementProvider defaultScreen={App} fullScreen>
      <KeyboardProvider autoTab={false} >
         <CurrentScreen />
      </KeyboardProvider>
   </ScenarioManagementProvider>
)
