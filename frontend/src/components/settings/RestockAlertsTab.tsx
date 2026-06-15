'use client';

import { useCallback, useMemo } from 'react';
import { PackageSearch } from 'lucide-react';
import MultiSearchableSelect from '@/components/ui/MultiSearchableSelect';
import type { SearchableSelectItem } from '@/components/ui/SearchableSelect';
import { useCategoriesQuery } from '@/hooks/categories/useCategoriesQuery';
import { fetchCategoryParentOptions } from '@/hooks/categories/useCategoriesTreeOptions';
import { useRestockStore } from '@/store/restock-store';

export default function RestockAlertsTab() {
  const categoryIds = useRestockStore((s) => s.categoryIds);
  const setCategoryIds = useRestockStore((s) => s.setCategoryIds);

  // Used only to resolve labels for already-selected chips (search results
  // populate labels for everything else lazily).
  const { data: categories } = useCategoriesQuery({ pageSize: 100 });

  const selectedItems = useMemo<SearchableSelectItem[]>(
    () =>
      (categories ?? [])
        .filter((c) => categoryIds.includes(c.id))
        .map((c) => ({ value: c.id, label: c.name })),
    [categories, categoryIds],
  );

  const fetchItems = useCallback(
    (search: string) => fetchCategoryParentOptions({ search }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="glass-panel p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-[1.2rem] bg-white/80 p-3 text-[var(--accent)] border border-[var(--border-glass)]">
            <PackageSearch size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
              Restock Alert Categories
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Pick the product categories you want to monitor. The dashboard&apos;s
              Restock Alerts count and Restock Watchlist will only include
              low-stock items from these categories. If none are selected, the
              dashboard shows no restock data.
            </p>
          </div>
        </div>

        <div className="mt-5 max-w-xl">
          <MultiSearchableSelect
            id="restock-categories"
            label="Monitored categories"
            value={categoryIds}
            onChange={setCategoryIds}
            fetchItems={fetchItems}
            selectedItems={selectedItems}
            placeholder="Search categories…"
            noResultsLabel="No categories found"
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Saved automatically — but only on this device and browser. It
            won&apos;t carry over to other computers, phones, or staff logins, and
            clearing your browser data will reset it.
          </p>
        </div>
      </div>
    </div>
  );
}
