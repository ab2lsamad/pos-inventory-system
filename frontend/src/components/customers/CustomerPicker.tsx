'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { User, X, ChevronDown } from 'lucide-react';
import { fetchAllCustomers } from '@/hooks/customers/useCustomersQuery';
import type { Customer } from '@/types/customer';

interface CustomerPickerProps {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function CustomerPicker({
  value,
  onChange,
  label = 'Customer',
  placeholder = 'Search by name or phone…',
  disabled = false,
}: CustomerPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await fetchAllCustomers(q || undefined);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void search(query), 300);
    return () => clearTimeout(timer);
  }, [open, query, search]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (customer: Customer) => {
    onChange(customer);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      {label && (
        <label className="text-sm font-semibold text-[var(--text-secondary)]">{label}</label>
      )}
      <div className="relative">
        {!open ? (
          <button
            type="button"
            onClick={handleOpen}
            disabled={disabled}
            className="w-full flex items-center justify-between rounded-2xl border border-[var(--border-glass)] bg-white/90 px-4 py-3 text-sm transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/12 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {value ? (
              <span className="flex items-center gap-2 text-[var(--text-primary)]">
                <User size={14} className="text-blue-400 shrink-0" />
                <span className="font-medium">{value.fullName}</span>
                {value.phone && (
                  <span className="text-slate-400 text-xs">{value.phone}</span>
                )}
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">{placeholder}</span>
            )}
            <span className="flex items-center gap-1 shrink-0">
              {value && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
                  className="p-0.5 rounded hover:bg-slate-100 cursor-pointer"
                >
                  <X size={12} className="text-slate-400" />
                </span>
              )}
              <ChevronDown size={14} className="text-[var(--text-muted)]" />
            </span>
          </button>
        ) : (
          <div className="relative">
            <User
              size={14}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-2xl border border-[var(--accent)] bg-white/90 py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none ring-4 ring-[var(--accent)]/12"
            />
          </div>
        )}

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-2xl border border-[var(--border-glass)] bg-white overflow-hidden">
            {loading ? (
              <div className="px-4 py-3 text-sm text-slate-400">Searching…</div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">No customers found</div>
            ) : (
              <ul className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                {results.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(customer)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                    >
                      <User size={14} className="text-blue-400 shrink-0" />
                      <span className="font-medium text-sm text-[var(--text-primary)]">
                        {customer.fullName}
                      </span>
                      {customer.phone && (
                        <span className="text-xs text-slate-400 ml-auto">{customer.phone}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
