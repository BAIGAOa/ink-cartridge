import React, { useContext, useEffect, useRef, useState } from "react";
import { Box, Text, useWindowSize } from "ink";
import { useKeyboard } from "../keyboard/hook.js";
import { ModalContext } from "../screen/ModalContext.js";
import { GlobalProps } from "./types.js";
import { useScreenSystem } from "../screen/hook.js";
import { registerComponent } from "../screen/registry.js";
import { SelectInput } from "../components/select/SelectInput.js";
import type { Item } from "../components/select/types.js";
import type {
  ResolvedGlobalSequenceEntry,
} from "../keyboard/types.js";

// Modal panel displaying all registered global sequence key bindings.
// Opened from DevScreen via Ctrl+S.
// Uses the same SelectInput + expandable-card pattern as GlobalKeyDisplayBox
// and LayerKeyDisplayBox.
// @2026-07-16 v3.8.0

const PANEL_HEIGHT = 30;

interface GlobalSeqItem extends Item<ResolvedGlobalSequenceEntry> {}

// ---- Build a compact label for a global sequence entry ----
//
// Shows the full key sequence followed by short badges for non-default
// options: [ao] = affectOverlay, [excl] = exclusive, [no-cover] = cover:false,
// [xno] = executeWhenNoOverlay, [T:N] = non-default timeout, [cat] = non-* category.

function buildLabel(entry: ResolvedGlobalSequenceEntry): string {
  const keys = entry.keys.join(', ');
  const badges: string[] = [];
  if (entry.affectOverlay) badges.push('[ao]');
  if (entry.exclusive) badges.push('[excl]');
  if (entry.cover === false) badges.push('[no-cover]');
  if (entry.executeWhenNoOverlay) badges.push('[xno]');
  if (entry.timeout !== undefined && entry.timeout !== 500) badges.push(`[T:${entry.timeout}]`);
  if (entry.category && entry.category !== '*') badges.push('[cat]');
  return badges.length > 0 ? `${keys}  ${badges.join(' ')}` : keys;
}

function fmtCategory(category: ResolvedGlobalSequenceEntry['category']): string {
  if (category === undefined || category === '*') return '*';
  return category.map(c => (c as any).displayName || (c as any).name || '?').join(', ');
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
      <Box width={22}>
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

export default function GlobalSequenceDisplayBox({ top: initialTop, left }: GlobalProps) {
  const { getGlobalSequences, getGlobalPendingSequence, boundKeyboard } = useKeyboard();
  const { closeModal } = useScreenSystem();
  const modalCtx = useContext(ModalContext);
  const modalId = modalCtx?.id ?? null;
  const { rows } = useWindowSize();

  const [offsetTop, setOffsetTop] = useState(initialTop);
  const [expandedEntry, setExpandedEntry] = useState<ResolvedGlobalSequenceEntry | null>(null);
  // pending is read fresh on every render via getGlobalPendingSequence()
  const pending = getGlobalPendingSequence();

  const clampTopRef = useRef((next: number) => next);
  clampTopRef.current = (next: number) =>
    Math.max(0, Math.min(next, rows - PANEL_HEIGHT));

  const expandedEntryRef = useRef(expandedEntry);
  expandedEntryRef.current = expandedEntry;

  // Enter collapses detail card back to list
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
    { focusId: 'globalSeq-control' });
    const uDown = boundKeyboard(['down'], () =>
      setOffsetTop(prev => clampTopRef.current(prev + 1)),
    { focusId: 'globalSeq-control' });
    return () => { uUp(); uDown(); };
  }, []);

  // Escape closes the modal
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

  const entries = getGlobalSequences();

  const items: GlobalSeqItem[] = entries.map((entry, i) => ({
    label: buildLabel(entry),
    value: entry,
    Key: `gs-${i}`,
  }));

  const handleSelect = (item: GlobalSeqItem) => {
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
      {/* Title + pending indicator */}
      <Box flexDirection="row">
        <Text bold color="cyan">▌ Global Sequences </Text>
        <Text dimColor>({entries.length})</Text>
        {pending && (
          <Text color="yellow">
            {'  '}Pending: {pending.sequences.join(', ')} [{pending.nextIndex}/{pending.sequences.length}]
          </Text>
        )}
      </Box>
      <Sep />

      {expandedEntry ? (
        <Box flexDirection="column" paddingY={1}>
          <Box paddingBottom={1}>
            <Text color="yellow" bold>
              {expandedEntry.keys.join(', ')}
            </Text>
          </Box>
          <Sep />
          <Box paddingY={1} flexDirection="column">
            <Row label="Keys"><Text color="white">{expandedEntry.keys.join(', ')}</Text></Row>
            <Row label="Cover"><BoolVal v={expandedEntry.cover} /></Row>
            <Row label="AffectOverlay"><BoolVal v={expandedEntry.affectOverlay} /></Row>
            <Row label="Category"><Text color="white">{fmtCategory(expandedEntry.category)}</Text></Row>
            <Row label="Timeout"><Text color="white">{expandedEntry.timeout ?? 500}ms</Text></Row>
            <Row label="Exclusive"><BoolVal v={expandedEntry.exclusive} /></Row>
            <Row label="When"><BoolVal v={expandedEntry.when != null} /></Row>
            <Row label="ExecWhenNoOv"><BoolVal v={expandedEntry.executeWhenNoOverlay} /></Row>
          </Box>
        </Box>
      ) : items.length === 0 ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text color="gray">No global sequences registered.</Text>
        </Box>
      ) : (
        <SelectInput<ResolvedGlobalSequenceEntry, GlobalSeqItem>
          items={items}
          onSelect={handleSelect}
          focusId="global-seq-list"
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

registerComponent(GlobalSequenceDisplayBox, {
  top: 0,
  left: 0,
});
