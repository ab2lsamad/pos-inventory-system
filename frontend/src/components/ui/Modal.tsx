'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  /** Custom footer — when provided, overrides built-in cancel/confirm footer. */
  footer?: React.ReactNode;
  /** Built-in footer: id of the <form> this modal wraps */
  formId?: string;
  /** Built-in footer: cancel handler */
  onCancel?: () => void;
  /** Built-in footer: loading state for the confirm button */
  isLoading?: boolean;
  /** Built-in footer: confirm button label (default "Save") */
  confirmLabel?: string;
  /** Built-in footer: cancel button label (default "Cancel") */
  cancelLabel?: string;
  /** Built-in footer: button type for the confirm button (default "submit") */
  confirmType?: 'button' | 'submit';
  /** Built-in footer: variant for the confirm button (default "primary") */
  confirmVariant?: 'primary' | 'danger';
  /** Built-in footer: click handler when confirmType is "button" */
  onConfirm?: () => void;
  /** Built-in footer: disable the confirm button */
  disabled?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  footer,
  formId,
  onCancel,
  isLoading = false,
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  confirmType = 'submit',
  confirmVariant = 'primary',
  onConfirm,
  disabled = false,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  const resolvedFooter =
    footer ??
    (onCancel ? (
      <div className="flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          type={confirmType}
          form={formId}
          variant={confirmVariant}
          onClick={onConfirm}
          isLoading={isLoading}
          disabled={disabled}
        >
          {confirmLabel}
        </Button>
      </div>
    ) : null);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
      />
      <div
        className={`relative ${maxWidth} flex w-full flex-col max-h-[calc(100vh-3rem)] rounded-[1.75rem] border border-[var(--border-glass)] bg-[var(--bg-secondary)] sm:max-h-[calc(100vh-5rem)]`}
      >
        <div className="flex-none flex items-center justify-between border-b border-[var(--border-glass)] px-6 py-4">
          <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>
        {resolvedFooter ? (
          <div className="flex-none border-t border-[var(--border-glass)] px-6 py-4">
            {resolvedFooter}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** Standalone footer actions — use when the modal's built-in footer props are not sufficient. */
interface ModalActionsProps {
  onCancel: () => void;
  onConfirm?: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmType?: 'button' | 'submit';
  confirmVariant?: 'primary' | 'danger';
  disabled?: boolean;
  formId?: string;
}

export function ModalActions({
  onCancel,
  onConfirm,
  isLoading = false,
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  confirmType = 'button',
  confirmVariant = 'primary',
  disabled = false,
  formId,
}: ModalActionsProps) {
  return (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
        {cancelLabel}
      </Button>
      <Button
        type={confirmType}
        form={formId}
        variant={confirmVariant}
        onClick={onConfirm}
        isLoading={isLoading}
        disabled={disabled}
      >
        {confirmLabel}
      </Button>
    </div>
  );
}
