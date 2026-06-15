'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RotateCcw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchableSelect, {
  type SearchableSelectItem,
} from '@/components/ui/SearchableSelect';
import Switch from '@/components/ui/Switch';
import PageLayout from '@/components/layout/PageLayout';
import ProductsTable from '@/components/products/ProductsTable';
import ProductDetailModal from '@/components/products/ProductDetailModal';
import { useArchiveProduct } from '@/hooks/products/useArchiveProduct';
import { useBrandsQuery } from '@/hooks/brands/useBrandsQuery';
import { useCategoriesQuery } from '@/hooks/categories/useCategoriesQuery';
import { canWrite } from '@/lib/route-access';
import { useAuthStore } from '@/store/auth-store';
import { ProductType } from '@/types/shared';
import type { Product } from '@/types/product';
import type { Category } from '@/types/category';
import type { Brand } from '@/types/brand';

const TYPE_ITEMS: SearchableSelectItem[] = [
  { value: ProductType.SIMPLE, label: 'Simple' },
  { value: ProductType.VARIABLE, label: 'Variable' },
];

export default function ProductsPage() {
  const router = useRouter();
  const userRole = useAuthStore((state) => state.user?.role);
  const canManage = canWrite(userRole);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const archiveProduct = useArchiveProduct();
  const { data: categories } = useCategoriesQuery({ pageSize: 100 });
  const { data: brands } = useBrandsQuery({ pageSize: 100 });

  // children map: parentId → direct child ids. Used to walk the tree when a
  // filter is set so descendants are included.
  const childrenByParent = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of categories) {
      if (c.parentId) {
        const arr = map.get(c.parentId) ?? [];
        arr.push(c.id);
        map.set(c.parentId, arr);
      }
    }
    return map;
  }, [categories]);

  const expandedCategoryIds = useMemo<string[] | undefined>(() => {
    if (!categoryFilter) return undefined;
    const result = new Set<string>();
    const stack = [categoryFilter];
    while (stack.length) {
      const id = stack.pop()!;
      if (result.has(id)) continue;
      result.add(id);
      const children = childrenByParent.get(id);
      if (children) stack.push(...children);
    }
    return [...result];
  }, [categoryFilter, childrenByParent]);

  const categoryItems: SearchableSelectItem[] = useMemo(
    () => buildCategoryItems(categories),
    [categories],
  );
  const brandItems: SearchableSelectItem[] = useMemo(
    () => brands.map((b: Brand) => ({ value: b.id, label: b.name })),
    [brands],
  );

  const selectedCategoryItem =
    categoryItems.find((i) => i.value === categoryFilter) ?? null;
  const selectedBrandItem =
    brandItems.find((i) => i.value === brandFilter) ?? null;
  const selectedTypeItem =
    TYPE_ITEMS.find((i) => i.value === typeFilter) ?? null;

  const fetchTypes = useCallback(
    async (q: string): Promise<SearchableSelectItem[]> => {
      const needle = q.trim().toLowerCase();
      return needle
        ? TYPE_ITEMS.filter((i) => i.label.toLowerCase().includes(needle))
        : TYPE_ITEMS;
    },
    [],
  );

  const fetchCategoryItems = useCallback(
    async (q: string): Promise<SearchableSelectItem[]> => {
      const needle = q.trim().toLowerCase();
      return needle
        ? categoryItems.filter((i) => i.label.toLowerCase().includes(needle))
        : categoryItems;
    },
    [categoryItems],
  );

  const fetchBrandItems = useCallback(
    async (q: string): Promise<SearchableSelectItem[]> => {
      const needle = q.trim().toLowerCase();
      return needle
        ? brandItems.filter((i) => i.label.toLowerCase().includes(needle))
        : brandItems;
    },
    [brandItems],
  );

  const openCreate = () => router.push('/products/new');
  const openEdit = (product: Product) => router.push(`/products/${product.id}/edit`);

  const handleArchive = async (id: string) => {
    try {
      await archiveProduct.mutateAsync(id);
      toast.success('Product archived');
      if (viewProduct?.id === id) setViewProduct(null);
    } catch {
      // error handled by hook
    }
  };

  const resetPage = () => setPage(1);

  const hasActiveFilters =
    !!search || !!typeFilter || !!categoryFilter || !!brandFilter;

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setCategoryFilter('');
    setBrandFilter('');
    resetPage();
  };

  return (
    <PageLayout
      title="Products"
      description="Manage products and variants"
      action={
        canManage ? (
          <Button onClick={openCreate}>
            <Plus size={16} />
            Add Product
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col section-gap">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-64">
            <Input
              placeholder="Search name, SKU, barcode…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              icon={<Search size={16} />}
            />
          </div>

          <div className="w-48">
            <SearchableSelect
              value={typeFilter || null}
              onChange={(v) => { setTypeFilter(v ?? ''); resetPage(); }}
              fetchItems={fetchTypes}
              selectedItem={selectedTypeItem}
              emptyOptionLabel="All types"
              placeholder="All types"
            />
          </div>

          <div className="w-56">
            <SearchableSelect
              value={categoryFilter || null}
              onChange={(v) => { setCategoryFilter(v ?? ''); resetPage(); }}
              fetchItems={fetchCategoryItems}
              selectedItem={selectedCategoryItem}
              emptyOptionLabel="All categories"
              placeholder="Search categories…"
            />
          </div>

          <div className="w-56">
            <SearchableSelect
              value={brandFilter || null}
              onChange={(v) => { setBrandFilter(v ?? ''); resetPage(); }}
              fetchItems={fetchBrandItems}
              selectedItem={selectedBrandItem}
              emptyOptionLabel="All brands"
              placeholder="Search brands…"
            />
          </div>

          <Switch
            label="Show archived"
            checked={includeArchived}
            onChange={(v) => { setIncludeArchived(v); resetPage(); }}
          />

          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <RotateCcw size={14} />
              Reset filters
            </Button>
          ) : null}
        </div>

        <ProductsTable
          page={page}
          search={search}
          type={typeFilter || undefined}
          categoryIds={expandedCategoryIds}
          brandId={brandFilter || undefined}
          includeArchived={includeArchived}
          canArchive={canManage}
          canEdit={canManage}
          onPageChange={setPage}
          onView={setViewProduct}
          onEdit={openEdit}
          onArchive={handleArchive}
        />

        <ProductDetailModal product={viewProduct} onClose={() => setViewProduct(null)} />
      </div>
    </PageLayout>
  );
}

// Render the category list ordered as a tree with indented children.
function buildCategoryItems(categories: Category[]): SearchableSelectItem[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const childrenByParent = new Map<string | null, Category[]>();
  for (const c of categories) {
    const key = c.parentId ?? null;
    const arr = childrenByParent.get(key) ?? [];
    arr.push(c);
    childrenByParent.set(key, arr);
  }
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }

  const items: SearchableSelectItem[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const kids = childrenByParent.get(parentId) ?? [];
    for (const c of kids) {
      const parentName = c.parentId ? byId.get(c.parentId)?.name : undefined;
      items.push({
        value: c.id,
        label: c.name,
        sublabel: parentName ? `under ${parentName}` : undefined,
        indent: depth,
      });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return items;
}
