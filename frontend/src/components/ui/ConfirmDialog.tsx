'use client';

import type { ReactNode } from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  isLoading?: boolean;
}

/**
 * Lightweight yes/no confirmation modal — a replacement for window.confirm().
 * The confirm button stays in a loading state while the async action runs.
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
      onCancel={onClose}
      onConfirm={onConfirm}
      confirmType="button"
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      confirmVariant={confirmVariant}
      isLoading={isLoading}
    >
      <div className="text-sm leading-6 text-[var(--text-secondary)]">{message}</div>
    </Modal>
  );
}
