/**
 * Modal: confirm card deletion.
 *
 * Uses ink-cartridge's ConfirmDialog component which provides
 * built-in keyboard handling (Tab to switch, Enter to confirm).
 * Wrapped in an absolute-positioned Box to overlay the screen
 * without causing layout shift.
 */
import React from 'react';
import { Box, useWindowSize } from 'ink';
import { ConfirmDialog } from '../../../src/index.js';
import { centerOverlay } from '../layout.js';

const MODAL_W = 44;
const MODAL_H = 9;

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) {
  const { columns, rows } = useWindowSize();
  const { top, left } = centerOverlay(columns, rows, MODAL_W, MODAL_H);

  return (
    <Box
      position="absolute"
      top={top}
      left={left}
      width={MODAL_W}
      height={MODAL_H}
    >
      <ConfirmDialog
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </Box>
  );
}
