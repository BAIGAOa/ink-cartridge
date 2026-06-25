import React, { useContext, useEffect, useRef, useState } from "react";
import { Box, Text, useWindowSize } from "ink";
import { useKeyboard } from "../keyboard/hook.js";
import { ModalContext } from "../screen/ModalContext.js";
import { GlobalProps } from "./types.js";
import { useScreenSystem } from "../screen/hook.js";
import { registerComponent } from "../screen/registry.js";
import { SelectInput } from "../components/select/SelectInput.js";
import type { Item } from "../components/select/types.js";
import type { ResolvedGlobalKeyEntry } from "../keyboard/types.js";

// This modal box displays information about all registered global keys.
// Because it is a modal, its keyboard is independent and will not be
// affected by DevTool. When the user presses Enter on a list item the
// detail panel expands; Enter again collapses back to the list.
// @2026-07-16 v3.6.2

const PANEL_HEIGHT = 30;

interface GlobalKeyItem extends Item<ResolvedGlobalKeyEntry> {}

/**
 * Build a compact label for a global key entry.
 *
 * Shows the key name(s) followed by short badges for non-default options:
 * `[ao]` = affectOverlay, `[xno]` = executeWhenNoOverlay, `[×N]` = times.
 */
function buildLabel(entry: ResolvedGlobalKeyEntry): string {
  const keys = Array.isArray(entry.key) ? entry.key.join(', ') : entry.key;
  const badges: string[] = [];
  if (entry.affectOverlay) badges.push('[ao]');
  if (entry.executeWhenNoOverlay) badges.push('[xno]');
  if (entry.times !== undefined) badges.push(`[×${entry.times}]`);
  return badges.length > 0 ? `${keys}  ${badges.join(' ')}` : keys;
}

function fmtCategory(category: ResolvedGlobalKeyEntry['category']): string {
  if (category === undefined || category === '*') return '*';
  return category.map(c => c.displayName || c.name || '?').join(', ');
}

/** Renders a boolean value in green (true) or red (false). */
function BoolVal({ v }: { v: boolean | undefined }) {
  const c = v === false ? 'red' : 'green';
  return <Text color={c}>{String(v ?? true)}</Text>;
}

/** Two-column detail row: dim label on left, value slot on right. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box flexDirection="row">
      <Box width={18}>
        <Text dimColor>{label}</Text>
      </Box>
      {children}
    </Box>
  );
}

/** Blue separator line for visual sectioning. */
const Sep = () => (
  <Box>
    <Text color="blue" dimColor>{"─".repeat(50)}</Text>
  </Box>
);

export default function GlobalKeyDisplayBox({ top: initialTop, left }: GlobalProps) {
  const { getGlobalKeys, boundKeyboard } = useKeyboard();
  const { closeModal } = useScreenSystem();
  const modalId = useContext(ModalContext);
  const { rows } = useWindowSize();

  const [offsetTop, setOffsetTop] = useState(initialTop);
  const [expandedEntry, setExpandedEntry] = useState<ResolvedGlobalKeyEntry | null>(null);

  const clampTopRef = useRef((next: number) => next);
  clampTopRef.current = (next: number) =>
    Math.max(0, Math.min(next, rows - PANEL_HEIGHT));

  const expandedEntryRef = useRef(expandedEntry);
  expandedEntryRef.current = expandedEntry;

  // Bind return at the screen level so Enter collapses the detail panel.
  // When the SelectInput is rendered (not expanded), its focus-level
  // return binding takes priority and this binding is never reached.
  useEffect(() => {
    const unReturn = boundKeyboard(['return'], () => {
      if (expandedEntryRef.current) {
        setExpandedEntry(null);
      }
    });
    return () => { unReturn(); };
  }, []);

  // Panel movement via up/down arrow keys
  useEffect(() => {
    const uUp = boundKeyboard(['up'], () =>
      setOffsetTop(prev => clampTopRef.current(prev - 1)),
    {
      focusId: 'globalKey-control'
    });
    const uDown = boundKeyboard(['down'], () =>
      setOffsetTop(prev => clampTopRef.current(prev + 1)),
    {
      focusId: 'globalKey-control'
    });
    return () => { uUp(); uDown(); };
  }, []);

  useEffect(() => {
    const unEscape = boundKeyboard(['escape'], () => {
      if (modalId) closeModal(modalId);
    });
    return () => { unEscape(); };
  }, [modalId]);

  // Re-clamp on terminal resize
  useEffect(() => {
    setOffsetTop(prev => clampTopRef.current(prev));
  }, [rows]);

  const entries = getGlobalKeys();

  const items: GlobalKeyItem[] = entries.map((entry, i) => ({
    label: buildLabel(entry),
    value: entry,
    Key: `gk-${i}`,
  }));

  const handleSelect = (item: GlobalKeyItem) => {
    if (expandedEntry === item.value) {
      setExpandedEntry(null);
    } else {
      setExpandedEntry(item.value);
    }
  };

  return (
    <Box
      position="absolute"
      top={offsetTop}
      left={left}
      height={PANEL_HEIGHT}
      width='100%'
      borderStyle='bold'
      borderColor='white'
      backgroundColor='black'
      flexDirection="column"
      paddingX={1}
      paddingY={1}
    >
      <Box>
        <Text bold color="cyan">▌ Global Keys </Text>
        <Text dimColor>({entries.length})</Text>
      </Box>
      <Sep />

      {expandedEntry ? (
        <Box flexDirection="column" paddingY={1}>
          <Box paddingBottom={1}>
            <Text color="yellow" bold>
              {Array.isArray(expandedEntry.key) ? expandedEntry.key.join(', ') : expandedEntry.key}
            </Text>
          </Box>
          <Sep />
          <Box paddingY={1} flexDirection="column">
            <Row label="Cover"><BoolVal v={expandedEntry.cover} /></Row>
            <Row label="AffectOverlay"><BoolVal v={expandedEntry.affectOverlay} /></Row>
            <Row label="ExecWhenNoOv"><BoolVal v={expandedEntry.executeWhenNoOverlay} /></Row>
            <Row label="Times"><Text color="white">{expandedEntry.times ?? '—'}</Text></Row>
            <Row label="Category"><Text color="white">{fmtCategory(expandedEntry.category)}</Text></Row>
            <Row label="When"><BoolVal v={expandedEntry.when != null} /></Row>
            <Row label="Observer"><BoolVal v={expandedEntry.observer != null} /></Row>
          </Box>
        </Box>
      ) : items.length === 0 ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text color="gray">No global keys registered.</Text>
        </Box>
      ) : (
        <SelectInput<ResolvedGlobalKeyEntry, GlobalKeyItem>
          items={items}
          onSelect={handleSelect}
          focusId="global-key-list"
          limit={9}
        />
      )}

      <Sep />
      <Box paddingTop={1}>
        <Text dimColor>
          {expandedEntry
            ? 'Enter: collapse  |  Esc: close'
            : 'Tab: switch focus  |  Enter: details  |  Esc: close'}
        </Text>
      </Box>
    </Box>
  );
}

registerComponent(GlobalKeyDisplayBox, {
  top: 0,
  left: 0
})
