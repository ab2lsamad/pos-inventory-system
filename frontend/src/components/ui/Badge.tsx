'use client';

import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'border-[var(--border-glass)] bg-white/70 text-[var(--text-secondary)]',
    success: 'border-emerald-200 bg-[var(--success-bg)] text-[var(--success)]',
    warning: 'border-amber-200 bg-[var(--warning-bg)] text-[var(--warning)]',
    danger: 'border-red-200 bg-[var(--danger-bg)] text-[var(--danger)]',
    info: 'border-[var(--accent)]/10 bg-[var(--accent-soft)] text-[var(--accent-hover)]',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
