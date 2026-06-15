'use client';

import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, onFocus, type, ...props }, ref) => {
    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      if (
        type === 'number' &&
        /^(0|0\.0+)$/.test(event.currentTarget.value)
      ) {
        event.currentTarget.select();
      }

      onFocus?.(event);
    };

    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {label ? (
          <label htmlFor={id} className="text-sm font-semibold text-[var(--text-secondary)]">
            {label}
          </label>
        ) : null}
        <div className="group relative">
          {icon ? (
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition group-focus-within:text-[var(--accent)]">
              {icon}
            </div>
          ) : null}
          <input
            ref={ref}
            id={id}
            type={type}
            onFocus={handleFocus}
            className={`
              w-full rounded-2xl border border-[var(--border-glass)] bg-white/90 text-[var(--text-primary)]
              placeholder:text-[var(--text-muted)] transition outline-none
              focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/12
              ${icon ? 'py-3 pl-11 pr-4' : 'px-4 py-3'}
              ${error ? 'border-[var(--danger)] focus:ring-[var(--danger)]/10' : ''}
            `}
            {...props}
          />
        </div>
        {error ? <p className="text-xs font-medium text-[var(--danger)]">{error}</p> : null}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
