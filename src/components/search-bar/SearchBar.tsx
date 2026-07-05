import { Box, Text, useWindowSize } from "ink";
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { TextInput } from "../text/TextInput.js";
import { useKeyboard } from "../../keyboard/hook.js";
import type { SearchBarProps } from "./search-bar-types.js";

/**
 * Filter and sort items by query.
 * Priority: exact match → prefix match → earlier substring position.
 */
function filterAndSort(items: string[], query: string): string[] {
  if (!query.trim()) return items;
  const lower = query.toLowerCase();
  return items
    .filter((item) => item.toLowerCase().includes(lower))
    .sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      if (aLower === lower && bLower !== lower) return -1;
      if (aLower !== lower && bLower === lower) return 1;
      const aStarts = aLower.startsWith(lower);
      const bStarts = bLower.startsWith(lower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aLower.indexOf(lower) - bLower.indexOf(lower);
    });
}

const DEFAULT_MAX_VISIBLE = 10;

function DefaultResult({ item, isSelected }: { item: string; isSelected: boolean }) {
  return (
    <Text color={isSelected ? "cyan" : undefined} inverse={isSelected}>
      {item}
    </Text>
  );
}

function DefaultIndicator({ isSelected }: { isSelected: boolean }) {
  return <Text>{isSelected ? "> " : "  "}</Text>;
}

export default function SearchBar({
  focusId,
  width,
  items = [],
  onSubmit,
  maxVisibleResults = DEFAULT_MAX_VISIBLE,
  resultComponent: ResultComp,
  indicatorComponent: IndicatorComp,
}: SearchBarProps) {
  const Result = ResultComp ?? DefaultResult;
  const Indicator = IndicatorComp ?? DefaultIndicator;
  const [value, setValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const { columns } = useWindowSize();
  const { boundKeyboard } = useKeyboard();

  const inputWidth = width ?? Math.max(1, columns - 4);

  // Filter and sort results whenever the query or items change.
  const results = useMemo(
    () => filterAndSort(items, value),
    [items, value],
  );

  // Reset selection when the result set changes size.
  useEffect(() => {
    setSelectedIndex(0);
    setScrollOffset(0);
  }, [results.length]);

  // Virtual-scroll bounds.
  const limit =
    results.length > maxVisibleResults
      ? maxVisibleResults
      : Math.max(1, results.length);
  const maxScroll = Math.max(0, results.length - limit);
  const safeScroll = Math.max(0, Math.min(scrollOffset, maxScroll));
  const safeIndex = results.length === 0
    ? 0
    : Math.max(0, Math.min(selectedIndex, limit - 1));

  // Refs keep latest values accessible in keyboard callbacks without
  // re-binding on every keystroke (same pattern as useSelectNavigation).
  const resultsRef = useRef(results);
  resultsRef.current = results;
  const safeIndexRef = useRef(safeIndex);
  safeIndexRef.current = safeIndex;
  const safeScrollRef = useRef(safeScroll);
  safeScrollRef.current = safeScroll;
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const valueRef = useRef(value);
  valueRef.current = value;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  /**
   * Move the highlighted result up (-1) or down (+1), auto-scrolling
   * the virtual window when the selection leaves the visible area.
   */
  const moveHighlight = useCallback(
    (delta: number) => {
      const items = resultsRef.current;
      if (items.length === 0) return;
      const lim = limitRef.current;
      const scroll = safeScrollRef.current;
      const idx = safeIndexRef.current;
      const absIdx = scroll + idx;
      const newAbs = Math.max(0, Math.min(absIdx + delta, items.length - 1));
      if (newAbs < scroll) {
        setScrollOffset(newAbs);
        setSelectedIndex(0);
      } else if (newAbs >= scroll + lim) {
        setScrollOffset(newAbs - lim + 1);
        setSelectedIndex(lim - 1);
      } else {
        setSelectedIndex(newAbs - scroll);
      }
    },
    [],
  );

  // Screen-level keyboard bindings for results navigation.
  // Registered without focusId so they fire after TextInput's focus-level
  // bindings. TextInput does not bind up/down (in non-wrap mode) nor
  // return (when no onSubmit is passed), so these keys fall through.
  useEffect(() => {
    const unUp = boundKeyboard(['up'], () => moveHighlight(-1));
    const unDown = boundKeyboard(['down'], () => moveHighlight(1));
    const unReturn = boundKeyboard(['return'], () => {
      const items = resultsRef.current;
      const idx = safeIndexRef.current;
      const scroll = safeScrollRef.current;
      const absIdx = scroll + idx;
      if (items.length > 0 && absIdx < items.length) {
        onSubmitRef.current?.(items[absIdx]);
      } else {
        onSubmitRef.current?.(valueRef.current);
      }
    });
    return () => {
      unUp();
      unDown();
      unReturn();
    }
  }, [boundKeyboard, moveHighlight]);

  // Visible slice of results.
  const visibleResults = results.length === 0
    ? []
    : results.slice(safeScroll, safeScroll + limit);

  const separatorWidth = Math.max(1, columns - 2);

  return (
    <Box
      flexDirection="column"
      width="100%"
      height="100%"
      borderColor="white"
      borderStyle="bold"
    >
      <Box flexDirection="row">
        <Text bold>{"> "}</Text>
        <TextInput
          focusId={focusId}
          value={value}
          onChange={setValue}
          width={inputWidth}
        />
      </Box>
      <Text bold>{"─".repeat(separatorWidth)}</Text>

      {/* Scroll-up indicator */}
      {safeScroll > 0 && (
        <Text color="grey">
          {"  ▲ "}{safeScroll}{" more"}
        </Text>
      )}

      {/* Results */}
      {visibleResults.map((item, i) => {
        const globalIdx = safeScroll + i;
        const isSelected = globalIdx === safeScroll + safeIndex;
        return (
          <Box key={globalIdx} flexDirection="row">
            <Indicator isSelected={isSelected} />
            <Result item={item} isSelected={isSelected} />
          </Box>
        );
      })}

      {/* Scroll-down indicator */}
      {safeScroll + limit < results.length && (
        <Text color="grey">
          {"  ▼ "}{results.length - safeScroll - limit}{" more"}
        </Text>
      )}

      {/* Empty state */}
      {value.trim() !== "" && results.length === 0 && (
        <Text color="grey">{"  No results for \""}{value}{"\""}</Text>
      )}
    </Box>
  );
}