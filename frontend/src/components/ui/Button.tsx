'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  type,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 disabled:cursor-not-allowed disabled:opacity-50';

  const variants: Record<string, string> = {
    primary:
      'border border-transparent bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] hover:-translate-y-0.5',
    secondary:
      'border border-[var(--border-glass)] bg-white/85 text-[var(--text-primary)] hover:bg-white',
    danger:
      'border border-transparent bg-[var(--danger)] text-white hover:bg-red-700 hover:-translate-y-0.5',
    ghost:
      'border border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-white/70 hover:text-[var(--text-primary)]',
    outline:
      'border border-[var(--accent)] bg-transparent text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-sm',
    icon: 'h-10 w-10 p-0',
  };

  return (
    <button
      type={type ?? 'button'}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
}
