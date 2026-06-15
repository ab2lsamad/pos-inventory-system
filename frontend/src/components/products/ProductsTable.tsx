'use client';

import { Archive, Edit, Eye, Package } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import TablePagination from '@/components/ui/TablePagination';
import { useProductsQuery } from '@/hooks/products/useProductsQuery';
import { getPriceSummary } from '@/lib/product-form';
import { ProductType } from '@/types/shared';
import type { Product } from '@/types/product';

interface ProductsTableProps {
  page: number;
  pageSize?: number;
  search?: string;
  type?: string;
  categoryIds?: string[];
  brandId?: string;
  includeArchived?: boolean;
  canArchive: boolean;
  canEdit: boolean;
  onPageChange: (page: number) => void;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onArchive: (productId: string) => void;
}

export default function ProductsTable({
  page,
  pageSize = 10,
  search,
  type,
  categoryIds,
  brandId,
  includeArchived,
  canArchive,
  canEdit,
  onPageChange,
  onView,
  onEdit,
  onArchive,
}: ProductsTableProps) {
  const { data: products, meta, isLoading, error, refetch } = useProductsQuery({
    page,
    pageSize,
    search,
    type,
    categoryIds,
    brandId,
    includeArchived,
  });

  const columns: Column<Product>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (product) => (
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-indigo-100/50 bg-indigo-50 text-indigo-500 transition-transform group-hover:scale-105">
            <Package size={18} />
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">{product.name}</p>
            <p className="mt-0.5 font-mono text-xs text-slate-400">{product.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (product) => (
        <Badge variant={product.type === ProductType.VARIABLE ? 'info' : 'default'}>
          {product.type === ProductType.VARIABLE ? 'Variable' : 'Simple'}
        </Badge>
      ),
    },
    {
      key: 'category',
      header: 'Category / Brand',
      render: (product) => (
        <div>
          <p className="text-sm text-[var(--text-primary)]">{product.category?.name ?? '—'}</p>
          {product.brand ? (
            <p className="mt-0.5 text-xs text-slate-400">{product.brand.name}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'variants',
      header: '# Variants',
      render: (product) => (
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {product.variantCount ?? product.variants.length}
        </span>
      ),
    },
    {
      key: 'pricing',
      header: 'Price Range',
      render: (product) => (
        <span className="text-sm text-[var(--text-primary)]">
          {getPriceSummary(product.variants)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Active',
      render: (product) => (
        <Badge variant={product.isActive ? 'success' : 'warning'}>
          {product.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]',
      className: 'p-5 text-right',
      render: (product) => (
        <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView(product)}
            className="h-8 w-8 !p-0"
            title="View product"
          >
            <Eye size={14} className="text-slate-400 hover:text-slate-700" />
          </Button>
          {canEdit ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(product)}
              className="h-8 w-8 !p-0"
              title="Edit product"
            >
              <Edit size={14} className="text-slate-400 hover:text-indigo-500" />
            </Button>
          ) : null}
          {canArchive && product.isActive ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onArchive(product.id)}
              className="h-8 w-8 !p-0"
              title="Archive product"
            >
              <Archive size={14} className="text-slate-400 hover:text-rose-500" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="glass-panel overflow-hidden">
      <DataTable
        columns={columns}
        data={products}
        loading={isLoading}
        error={error ? 'Failed to load products' : null}
        onRetry={() => void refetch()}
        rowKey={(product) => product.id}
        empty="No products found."
      />
      <TablePagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={pageSize}
        shown={products.length}
        onPageChange={onPageChange}
      />
    </div>
  );
}
