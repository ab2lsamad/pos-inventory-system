'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { SearchableSelectItem } from './SearchableSelect';

interface MultiSearchableSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
  fetchItems: (search: string) => Promise<SearchableSelectItem[]>;
  selectedItems?: SearchableSelectItem[];
  label?: string;
  placeholder?: string;
  noResultsLabel?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
}

export default function MultiSearchableSelect({
  value,
  onChange,
  fetchItems,
  selectedItems = [],
  label,
  placeholder = 'Select…',
  noResultsLabel = 'No results',
  disabled = false,
  error,
  id,
}: MultiSearchableSelectProps) {
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
    const timer = setTimeout(() => void runSearch(query), 200);
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

  const itemIndex = useMemo(() => {
    const map = new Map<string, SearchableSelectItem>();
    for (const it of items) map.set(it.value, it);
    for (const it of selectedItems) if (!map.has(it.value)) map.set(it.value, it);
    return map;
  }, [items, selectedItems]);

  const chips = useMemo(
    () => value.map((v) => itemIndex.get(v) ?? { value: v, label: v }),
    [value, itemIndex],
  );

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const removeChip = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== val));
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
            className={`w-full min-h-[48px] flex items-center justify-between gap-2 rounded-2xl border bg-white/90 px-3 py-2 text-sm transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/12 disabled:opacity-50 disabled:cursor-not-allowed ${
              error
                ? 'border-[var(--danger)] focus:ring-[var(--danger)]/10'
                : 'border-[var(--border-glass)]'
            }`}
          >
            <div className="flex flex-wrap items-center gap-1.5 flex-1 text-left">
              {chips.length === 0 ? (
                <span className="text-[var(--text-muted)] px-1">{placeholder}</span>
              ) : (
                chips.map((c) => (
                  <span
                    key={c.value}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600"
                  >
                    {c.label}
                    {!disabled && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => removeChip(c.value, e)}
                        className="rounded-full hover:bg-indigo-100 p-0.5"
                        aria-label={`Remove ${c.label}`}
                      >
                        <X size={10} />
                      </span>
                    )}
                  </span>
                ))
              )}
            </div>
            <ChevronDown size={14} className="text-[var(--text-muted)] shrink-0" />
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
            {loading ? (
              <div className="px-4 py-3 text-sm text-slate-400">Searching…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">{noResultsLabel}</div>
            ) : (
              <ul className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                {items.map((item) => {
                  const checked = value.includes(item.value);
                  return (
                    <li key={item.value}>
                      <button
                        type="button"
                        onClick={() => toggle(item.value)}
                        disabled={item.disabled}
                        className={`w-full flex items-center gap-3 text-left px-4 py-2.5 transition-colors ${
                          item.disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-slate-50'
                        } ${checked ? 'bg-indigo-50/60' : ''}`}
                      >
                        <span
                          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            checked
                              ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {checked ? (
                            <svg viewBox="0 0 16 16" className="h-3 w-3 fill-current">
                              <path d="M13.78 4.22a.75.75 0 010 1.06l-6.5 6.5a.75.75 0 01-1.06 0l-3-3a.75.75 0 011.06-1.06L6.75 10.19l5.97-5.97a.75.75 0 011.06 0z" />
                            </svg>
                          ) : null}
                        </span>
                        <span className="font-medium text-sm text-[var(--text-primary)]">
                          {item.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
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
