import React, { useContext, useEffect, useRef, useState } from "react";
import { Box, Text, useWindowSize } from "ink";
import { useKeyboard } from "../keyboard/hook.js";
import { ModalContext } from "../screen/ModalContext.js";
import { useScreenSystem } from "../screen/hook.js";
import { registerComponent } from "../screen/registry.js";
import { SelectInput } from "../components/select/SelectInput.js";
import type { Item } from "../components/select/types.js";
import type {
  BoundKeyEntry,
  SequenceBinding,
  KeyRule,
  FocusTarget,
} from "../keyboard/types.js";
import type { LayerOwner } from "../keyboard/context.js";

// Modal panel showing the full keyboard-layer details for a given
// screen / overlay / modal owner. Opened from DevScreen via Ctrl+K.
// Uses the same SelectInput + expandable-card pattern as GlobalKeyDisplayBox.
// @2026-06-27 v3.8.0

const PANEL_HEIGHT = 30;

// ---- Item types ----

type LayerDetailItem =
  | { kind: 'bindings'; idx: number; entry: BoundKeyEntry }
  | { kind: 'sequences'; idx: number; firstKey: string; entry: SequenceBinding }
  | { kind: 'stopped'; idx: number; rule: KeyRule }
  | { kind: 'blocked'; idx: number; rule: KeyRule }
  | { kind: 'focusTarget'; focusId: string; target: FocusTarget };

interface LayerKeyItem extends Item<LayerDetailItem> {}

// ---- Formatting helpers ----

function keyRuleLabel(rule: KeyRule): string {
  const key = Array.isArray(rule.key) ? rule.key.join(', ') : rule.key;
  return rule.when ? `${key} [when]` : key;
}

function boundKeysLabel(entry: BoundKeyEntry): string {
  return entry.keys.join(', ');
}

function seqLabel(_firstKey: string, entry: SequenceBinding): string {
  const parts = entry.keys.join(', ');
  const badges: string[] = [];
  if (entry.options?.exclusive) badges.push('[excl]');
  if (entry.options?.focusId) badges.push(`[focus:${entry.options.focusId}]`);
  if (entry.options?.onlyThis) badges.push('[onlyThis]');
  if (entry.timeout !== undefined) badges.push(`[${entry.timeout}ms]`);
  return badges.length > 0 ? `${parts}  ${badges.join(' ')}` : parts;
}

function fmtKeys(keys: string | string[]): string {
  return Array.isArray(keys) ? (keys as string[]).join(', ') : keys;
}

// ---- Mini display components ----

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

function BoolVal({ v }: { v: boolean | undefined }) {
  return <Text color={v === false ? 'red' : 'green'}>{String(v ?? true)}</Text>;
}

const Sep = () => (
  <Box>
    <Text color="blue" dimColor>{"─".repeat(50)}</Text>
  </Box>
);

// ---- Detail views ----

function BindingDetail({ entry }: { entry: BoundKeyEntry }) {
  return (
    <Box flexDirection="column" paddingY={1}>
      <Box paddingBottom={1}>
        <Text color="yellow" bold>{entry.keys.join(', ')}</Text>
      </Box>
      <Sep />
      <Box paddingY={1} flexDirection="column">
        <Row label="Keys"><Text color="white">{entry.keys.join(', ')}</Text></Row>
        <Row label="Handler"><BoolVal v={entry.handler != null} /></Row>
        <Row label="OnlyThis"><BoolVal v={entry.onlyThis} /></Row>
        <Row label="Owner (focusId)"><Text color="white">{typeof entry.owner === 'string' ? entry.owner : (entry.owner.displayName || entry.owner.name || 'Component')}</Text></Row>
        <Row label="Times"><Text color="white">{entry.times ?? '—'}</Text></Row>
        <Row label="PressCount"><Text color="white">{entry.pressCount ?? '—'}</Text></Row>
        <Row label="When"><BoolVal v={entry.when != null} /></Row>
        <Row label="Observer"><BoolVal v={entry.observer != null} /></Row>
      </Box>
    </Box>
  );
}

function SequenceDetail({ entry }: { firstKey: string; entry: SequenceBinding }) {
  return (
    <Box flexDirection="column" paddingY={1}>
      <Box paddingBottom={1}>
        <Text color="yellow" bold>{entry.keys.join(', ')}</Text>
      </Box>
      <Sep />
      <Box paddingY={1} flexDirection="column">
        <Row label="Keys"><Text color="white">{entry.keys.join(', ')}</Text></Row>
        <Row label="First key"><Text color="white">{entry.keys[0] || '—'}</Text></Row>
        <Row label="Timeout"><Text color="white">{entry.timeout ?? '500 (default)'}ms</Text></Row>
        <Row label="Exclusive"><BoolVal v={entry.options?.exclusive} /></Row>
        <Row label="OnlyThis"><BoolVal v={entry.options?.onlyThis} /></Row>
        <Row label="FocusId"><Text color="white">{entry.options?.focusId ?? '—'}</Text></Row>
        <Row label="When"><BoolVal v={entry.when != null} /></Row>
      </Box>
    </Box>
  );
}

function KeyRuleDetail({ label, rule }: { label: string; rule: KeyRule }) {
  return (
    <Box flexDirection="column" paddingY={1}>
      <Box paddingBottom={1}>
        <Text color="yellow" bold>{fmtKeys(rule.key)}</Text>
      </Box>
      <Sep />
      <Box paddingY={1} flexDirection="column">
        <Row label="Type"><Text color="white">{label}</Text></Row>
        <Row label="Key"><Text color="white">{fmtKeys(rule.key)}</Text></Row>
        <Row label="When"><BoolVal v={rule.when != null} /></Row>
      </Box>
    </Box>
  );
}

function FocusTargetDetail({ focusId, target }: { focusId: string; target: FocusTarget }) {
  return (
    <Box flexDirection="column" paddingY={1}>
      <Box paddingBottom={1}>
        <Text color="yellow" bold>{focusId}</Text>
      </Box>
      <Sep />
      <Box paddingY={1} flexDirection="column">
        <Row label="Focus ID"><Text color="white">{focusId}</Text></Row>
        <Row label="Bindings"><Text color="white">{target.bindings.length}</Text></Row>
        <Row label="Blocked"><Text color="white">{target.blockedKeys.length}</Text></Row>
        <Row label="Stopped"><Text color="white">{target.stoppedKeys.length}</Text></Row>
      </Box>
      {target.bindings.length > 0 && (
        <Box paddingTop={1} flexDirection="column">
          <Text color="cyan" dimColor>Bindings:</Text>
          {target.bindings.map((b, i) => (
            <Text key={i} color="gray">  [{b.keys.join(', ')}]</Text>
          ))}
        </Box>
      )}
      {target.blockedKeys.length > 0 && (
        <Box paddingTop={1} flexDirection="column">
          <Text color="gray" dimColor>Blocked:</Text>
          {target.blockedKeys.map((r, i) => (
            <Text key={i} color="gray">  {fmtKeys(r.key)}</Text>
          ))}
        </Box>
      )}
      {target.stoppedKeys.length > 0 && (
        <Box paddingTop={1} flexDirection="column">
          <Text color="red" dimColor>Stopped:</Text>
          {target.stoppedKeys.map((r, i) => (
            <Text key={i} color="gray">  {fmtKeys(r.key)}</Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ---- Main component ----

export interface LayerKeyDisplayProps {
  top: number;
  left: number;
  /** The component type whose layer to inspect. */
  screenComponent: LayerOwner;
}

export default function LayerKeyDisplayBox({ top: initialTop, left, screenComponent }: LayerKeyDisplayProps) {
  const { readLayer, boundKeyboard } = useKeyboard();
  const { closeModal } = useScreenSystem();
  const modalId = useContext(ModalContext);
  const { rows } = useWindowSize();

  const [offsetTop, setOffsetTop] = useState(initialTop);
  const [expandedEntry, setExpandedEntry] = useState<LayerDetailItem | null>(null);

  const clampTopRef = useRef((next: number) => next);
  clampTopRef.current = (next: number) =>
    Math.max(0, Math.min(next, rows - PANEL_HEIGHT));

  const expandedEntryRef = useRef(expandedEntry);
  expandedEntryRef.current = expandedEntry;

  const layer = readLayer(screenComponent);
  const layerName = (
    typeof screenComponent === 'string'
      ? screenComponent
      : (screenComponent.displayName || screenComponent.name || 'Unknown')
  ) as string;

  // Enter collapses detail card back to list
  useEffect(() => {
    const unReturn = boundKeyboard(['return'], () => {
      if (expandedEntryRef.current) setExpandedEntry(null);
    });
    return () => { unReturn(); };
  }, []);

  // Panel movement
  useEffect(() => {
    const uUp = boundKeyboard(['up'], () =>
      setOffsetTop(prev => clampTopRef.current(prev - 1)),
    { focusId: 'layerKey-control' });
    const uDown = boundKeyboard(['down'], () =>
      setOffsetTop(prev => clampTopRef.current(prev + 1)),
    { focusId: 'layerKey-control' });
    return () => { uUp(); uDown(); };
  }, []);

  // Escape closes the modal
  useEffect(() => {
    const unEscape = boundKeyboard(['escape'], () => {
      if (modalId) closeModal(modalId);
    });
    return () => { unEscape(); };
  }, [modalId]);

  useEffect(() => {
    setOffsetTop(prev => clampTopRef.current(prev));
  }, [rows]);

  // Build items
  if (!layer) {
    return (
      <Box position="absolute" top={offsetTop} left={left} height={10} width='100%'
        borderStyle='bold' borderColor='white' backgroundColor='black'
        paddingX={1} paddingY={1} justifyContent="center" alignItems="center">
        <Text color="gray">No layer data for "{layerName}".</Text>
      </Box>
    );
  }

  const items: LayerKeyItem[] = [];

  // Bindings
  layer.bindings.forEach((entry, i) => {
    items.push({
      label: `[Bind] ${boundKeysLabel(entry)}`,
      value: { kind: 'bindings', idx: i, entry },
      Key: `bind-${i}`,
    });
  });

  // Sequences
  for (const [firstKey, seqs] of layer.sequences) {
    seqs.forEach((entry, i) => {
      items.push({
        label: `[Seq]  ${seqLabel(firstKey, entry)}`,
        value: { kind: 'sequences', idx: i, firstKey, entry },
        Key: `seq-${firstKey}-${i}`,
      });
    });
  }

  // Stopped keys
  layer.stoppedKeys.forEach((rule, i) => {
    items.push({
      label: `[Stop] ${keyRuleLabel(rule)}`,
      value: { kind: 'stopped', idx: i, rule },
      Key: `stop-${i}`,
    });
  });

  // Blocked keys
  layer.blockedKeys.forEach((rule, i) => {
    items.push({
      label: `[Blk]  ${keyRuleLabel(rule)}`,
      value: { kind: 'blocked', idx: i, rule },
      Key: `blk-${i}`,
    });
  });

  // Focus targets
  for (const [focusId, target] of layer.focusTargets) {
    items.push({
      label: `[Foc]  ${focusId}  (bind:${target.bindings.length} blk:${target.blockedKeys.length} stp:${target.stoppedKeys.length})`,
      value: { kind: 'focusTarget', focusId, target },
      Key: `focus-${focusId}`,
    });
  }

  const handleSelect = (item: LayerKeyItem) => {
    if (expandedEntry && expandedEntry.kind === item.value.kind
      && (expandedEntry as any).idx === (item.value as any).idx
      && (expandedEntry as any).focusId === (item.value as any).focusId) {
      setExpandedEntry(null);
    } else {
      setExpandedEntry(item.value);
    }
  };

  const renderDetail = () => {
    if (!expandedEntry) return null;
    switch (expandedEntry.kind) {
      case 'bindings':
        return <BindingDetail entry={expandedEntry.entry} />;
      case 'sequences':
        return <SequenceDetail firstKey={expandedEntry.firstKey} entry={expandedEntry.entry} />;
      case 'stopped':
        return <KeyRuleDetail label="Stopped Key" rule={expandedEntry.rule} />;
      case 'blocked':
        return <KeyRuleDetail label="Blocked Key (pass-through)" rule={expandedEntry.rule} />;
      case 'focusTarget':
        return <FocusTargetDetail focusId={expandedEntry.focusId} target={expandedEntry.target} />;
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
        <Text bold color="cyan">▌ Layer: </Text>
        <Text color="yellow">{layerName}</Text>
        <Text dimColor>  kind={layer.kind}  focus={layer.currentFocusId ?? 'none'}</Text>
      </Box>
      <Sep />

      {expandedEntry ? (
        renderDetail()
      ) : items.length === 0 ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text color="gray">No bindings, sequences, stopped/blocked keys, or focus targets.</Text>
        </Box>
      ) : (
        <SelectInput<LayerDetailItem, LayerKeyItem>
          items={items}
          onSelect={handleSelect}
          focusId="layerKey-list"
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

registerComponent(LayerKeyDisplayBox, {
  top: 0,
  left: 0,
  screenComponent: (function Empty() { return null; }),
});
