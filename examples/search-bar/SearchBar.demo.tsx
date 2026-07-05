import React, { useState } from "react";
import SearchBar from "../../src/components/search-bar/SearchBar.js";
import type { SearchBarItem } from "../../src/components/search-bar/search-bar-types.js";
import { render, Box, Text } from "ink";
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  SelectInput,
} from "../../src/index.js";

const SAMPLE_ITEMS: SearchBarItem<string>[] = [
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
].map((name) => ({ label: name, value: name.toLowerCase() }));

// Stable reference — avoids unmount/remount on every keystroke.
const SingleResults: React.ComponentType<{
  items: SearchBarItem<string>[];
  onSelect: (item: SearchBarItem<string>) => void;
  focusId: string;
  query: string;
}> = ({ items, onSelect, focusId }) => (
  <SelectInput<string, SearchBarItem<string>>
    items={items}
    onSelect={onSelect}
    focusId={focusId}
    limit={8}
  />
);

function APP(){
  const [selected, setSelected] = useState<SearchBarItem<string> | undefined>(undefined);

  return (
    <Box flexDirection="column">
      <SearchBar
        focusId="search-bar"
        items={SAMPLE_ITEMS}
        onSubmit={setSelected}
        selectBar={SingleResults}
      />
      {selected && (
        <Box marginTop={1}>
          <Text color="green">
            Selected: {selected.label} ({selected.value})
          </Text>
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
