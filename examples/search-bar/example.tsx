import React, { useState } from "react";
import SearchBar from "../../src/components/search-bar/SearchBar.js";
import { render, Box, Text } from "ink";
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
} from "../../src/index.js";

const SAMPLE_ITEMS = [
  "Apple", "Banana", "Blueberry", "Blackberry",
  "Cherry", "Coconut", "Cranberry",
  "Date", "Dragonfruit",
  "Elderberry",
  "Fig",
  "Grape", "Grapefruit", "Guava",
  "Honeydew",
  "Jackfruit",
  "Kiwi", "Kumquat",
  "Lemon", "Lime", "Lychee",
  "Mango", "Melon", "Mulberry",
  "Nectarine",
  "Orange",
  "Papaya", "Peach", "Pear", "Pineapple", "Plum", "Pomegranate",
  "Raspberry",
  "Strawberry",
  "Tangerine",
  "Watermelon",
];

function APP(){
  const [selected, setSelected] = useState("");

  return (
    <Box flexDirection="column">
      <SearchBar
        focusId="search-bar"
        items={SAMPLE_ITEMS}
        onSubmit={setSelected}
        maxVisibleResults={8}
      />
      {selected && (
        <Box marginTop={1}>
          <Text color="green">Selected: {selected}</Text>
        </Box>
      )}
    </Box>
  );
}

registerComponent(APP, {});

render(
  <ScenarioManagementProvider defaultScreen={APP}>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
