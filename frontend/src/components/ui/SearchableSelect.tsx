'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SearchableSelectItem {
  value: string;
  label: string;
  sublabel?: string;
  indent?: number;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  fetchItems: (search: string) => Promise<SearchableSelectItem[]>;
  selectedItem?: SearchableSelectItem | null;
  label?: string;
  placeholder?: string;
  emptyOptionLabel?: string;
  noResultsLabel?: string;
  disabled?: boolean;
  error?: string;
  allowClear?: boolean;
  id?: string;
}

export default function SearchableSelect({
  value,
  onChange,
  fetchItems,
  selectedItem,
  label,
  placeholder = 'Select…',
  emptyOptionLabel,
  noResultsLabel = 'No results',
  disabled = false,
  error,
  allowClear = true,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchableSelectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const data = await fetchItems(q);
        setItems(data);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [fetchItems],
  );

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void runSearch(query), 250);
    return () => clearTimeout(timer);
  }, [open, query, runSearch]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const displayItem = useMemo<SearchableSelectItem | null>(() => {
    if (!value) return null;
    return (
      items.find((i) => i.value === value) ??
      (selectedItem && selectedItem.value === value ? selectedItem : null)
    );
  }, [value, items, selectedItem]);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (val: string | null) => {
    onChange(val);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-semibold text-[var(--text-secondary)]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {!open ? (
          <button
            id={id}
            type="button"
            onClick={handleOpen}
            disabled={disabled}
            className={`w-full flex items-center justify-between rounded-2xl border bg-white/90 px-4 py-3 text-sm transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/12 disabled:opacity-50 disabled:cursor-not-allowed ${
              error
                ? 'border-[var(--danger)] focus:ring-[var(--danger)]/10'
                : 'border-[var(--border-glass)]'
            }`}
          >
            {displayItem ? (
              <span className="flex flex-col items-start text-left text-[var(--text-primary)]">
                <span className="font-medium">{displayItem.label}</span>
                {displayItem.sublabel && (
                  <span className="text-xs text-slate-400">
                    {displayItem.sublabel}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">
                {emptyOptionLabel ?? placeholder}
              </span>
            )}
            <span className="flex items-center gap-1 shrink-0">
              {allowClear && value && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    handleClear(e as unknown as React.MouseEvent)
                  }
                  className="p-0.5 rounded hover:bg-slate-100 cursor-pointer"
                  aria-label="Clear"
                >
                  <X size={12} className="text-slate-400" />
                </span>
              )}
              <ChevronDown size={14} className="text-[var(--text-muted)]" />
            </span>
          </button>
        ) : (
          <div className="relative">
            <Search
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
          <div className="absolute z-50 mt-1 w-full rounded-2xl border border-[var(--border-glass)] bg-white shadow-lg overflow-hidden">
            {emptyOptionLabel && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full px-4 py-2.5 text-left text-sm text-slate-500 italic hover:bg-slate-50 transition-colors border-b border-slate-50"
              >
                {emptyOptionLabel}
              </button>
            )}
            {loading ? (
              <div className="px-4 py-3 text-sm text-slate-400">Searching…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">
                {noResultsLabel}
              </div>
            ) : (
              <ul className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                {items.map((item) => (
                  <li key={item.value}>
                    <button
                      type="button"
                      onClick={() =>
                        !item.disabled && handleSelect(item.value)
                      }
                      disabled={item.disabled}
                      className={`w-full flex flex-col items-start text-left px-4 py-2.5 transition-colors ${
                        item.disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-slate-50'
                      } ${item.value === value ? 'bg-indigo-50' : ''}`}
                      style={
                        item.indent
                          ? { paddingLeft: `${16 + item.indent * 16}px` }
                          : undefined
                      }
                    >
                      <span className="font-medium text-sm text-[var(--text-primary)]">
                        {item.indent ? (
                          <span className="text-slate-300 mr-1">↳</span>
                        ) : null}
                        {item.label}
                      </span>
                      {item.sublabel && (
                        <span className="text-xs text-slate-400">
                          {item.sublabel}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs font-medium text-[var(--danger)]">{error}</p>
      ) : null}
    </div>
  );
}
