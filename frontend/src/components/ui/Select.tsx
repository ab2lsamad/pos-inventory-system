'use client';

import React, { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...props }, ref) => {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {label ? (
          <label htmlFor={id} className="text-sm font-semibold text-[var(--text-secondary)]">
            {label}
          </label>
        ) : null}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={`
              w-full appearance-none rounded-2xl border border-[var(--border-glass)] bg-white/90 px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition
              focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/12
              ${error ? 'border-[var(--danger)] focus:ring-[var(--danger)]/10' : ''}
            `}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {error ? <p className="text-xs font-medium text-[var(--danger)]">{error}</p> : null}
      </div>
    );
  },
);

Select.displayName = 'Select';

export default Select;
