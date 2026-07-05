import React, { useState } from "react";
import SearchBar from "../../src/components/search-bar/SearchBar.js";
import type { SearchBarItem } from "../../src/components/search-bar/search-bar-types.js";
import { render, Box, Text } from "ink";
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  MultiSelectInput,
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

// Defined outside the component to keep a stable reference.
// The selectBar is a React.ComponentType, so inline closures cause
// unmount/remount on every keystroke, losing keyboard state.
const MultiResults: React.ComponentType<{
  items: SearchBarItem<string>[];
  onSelect: (item: SearchBarItem<string>) => void;
  focusId: string;
  query: string;
}> = ({ items, onSelect, focusId }) => {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <MultiSelectInput<string, SearchBarItem<string>>
      items={items}
      focusId={focusId}
      limit={6}
      selected={selected}
      onChange={setSelected}
      onSubmit={(vals) => {
        setSelected(vals);
        // Trigger focus return to TextInput
        if (items.length > 0) onSelect(items[0]);
      }}
    />
  );
};

function APP(){
  return (
    <Box flexDirection="column">
      <SearchBar
        focusId="search-bar"
        items={SAMPLE_ITEMS}
        selectBar={MultiResults}
      />
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
