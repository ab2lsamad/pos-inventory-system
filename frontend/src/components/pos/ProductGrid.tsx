'use client';

import { useMemo } from 'react';
import { PackageOpen, Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import { toNumber } from '@/lib/money';
import { getVariantAttributeMap } from '@/types/product';
import type { Product } from '@/types/product';
import type { Category } from '@/types/category';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onSelectedCategoryChange: (value: string) => void;
  error?: string | null;
  onSelectProduct: (product: Product) => void;
  variant?: 'pos' | 'compact';
}

const getActiveVariants = (product: Product) => product.variants.filter((v) => v.isActive);

// Returns the set of IDs for categoryId and all its descendants.
function getDescendantIds(categoryId: string, allCategories: Category[]): Set<string> {
  const result = new Set<string>([categoryId]);
  const queue = [categoryId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const cat of allCategories) {
      if (cat.parentId === current && !result.has(cat.id)) {
        result.add(cat.id);
        queue.push(cat.id);
      }
    }
  }
  return result;
}

function getProductPriceDisplay(product: Product): string {
  const variants = getActiveVariants(product);
  if (!variants.length) return '—';
  const prices = variants.map((v) => toNumber(v.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return min.toFixed(2);
  return `${min.toFixed(2)} – ${max.toFixed(2)}`;
}

export default function ProductGrid({
  products,
  categories,
  search,
  onSearchChange,
  selectedCategory,
  onSelectedCategoryChange,
  error,
  onSelectProduct,
  variant = 'pos',
}: ProductGridProps) {
  const allCategories = useMemo(() => categories ?? [], [categories]);

  const categoryDescendants = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return getDescendantIds(selectedCategory, allCategories);
  }, [selectedCategory, allCategories]);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const activeVariants = getActiveVariants(product);
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        activeVariants.some(
          (v) =>
            v.sku.toLowerCase().includes(term) ||
            (v.barcode ?? '').toLowerCase().includes(term) ||
            v.name.toLowerCase().includes(term),
        );
      const matchesCategory =
        selectedCategory === 'all' ||
        (product.categoryId != null && (categoryDescendants?.has(product.categoryId) ?? false));
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory, categoryDescendants]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--border-glass)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)]">Products</h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Select a product, then choose the variant if needed
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          <Input
            placeholder="Search by name, SKU, or barcode…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            icon={<Search size={16} />}
            id="pos-search"
            className="text-sm"
          />

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => onSelectedCategoryChange('all')}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-slate-100 text-[var(--text-secondary)] hover:bg-slate-200'
              }`}
            >
              All Items
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectedCategoryChange(cat.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-slate-100 text-[var(--text-secondary)] hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-400">
            <PackageOpen className="h-14 w-14 opacity-30" />
            <p className="font-semibold text-rose-600">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <PackageOpen className="h-14 w-14 opacity-30" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((product) => {
              const activeVariants = getActiveVariants(product);
              const variantSummary = activeVariants
                .slice(0, 3)
                .map((v) => {
                  const attrs = getVariantAttributeMap(v);
                  return Object.values(attrs).join('/') || v.name;
                })
                .join(', ');

              const priceDisplay = getProductPriceDisplay(product);

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onSelectProduct(product)}
                  className="group flex w-full items-center gap-3 rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-left transition-all hover:border-slate-200 hover:bg-slate-50/70"
                >
                  <div className="min-w-0 flex-1">
                    {/* Title row with price on the right */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
                        {product.name}
                      </h3>
                      <span className="shrink-0 text-xs font-bold text-[var(--text-primary)]">
                        {priceDisplay}
                      </span>
                    </div>

                    {/* Variant summary + tap hint */}
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      {variantSummary ? (
                        <p className="truncate text-[10px] font-medium tracking-[0.08em] text-[var(--text-muted)]">
                          {variantSummary}
                          {activeVariants.length > 3 ? ` +${activeVariants.length - 3} more` : ''}
                        </p>
                      ) : (
                        <span />
                      )}
                      <p className="shrink-0 text-[11px] font-medium text-slate-500">
                        {activeVariants.length > 1
                          ? `${activeVariants.length} variants`
                          : variant === 'pos'
                            ? 'Tap to add'
                            : 'Add'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
