'use client';

import { useMemo } from 'react';
import { Archive, Edit, Tags } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import TablePagination from '@/components/ui/TablePagination';
import { useCategoriesQuery } from '@/hooks/categories/useCategoriesQuery';
import { useArchiveCategory } from '@/hooks/categories/useArchiveCategory';
import type { Category } from '@/types/category';

interface CategoriesTableProps {
  page: number;
  pageSize?: number;
  search: string;
  includeArchived?: boolean;
  canManage: boolean;
  onPageChange: (page: number) => void;
  onEdit: (category: Category) => void;
}

export default function CategoriesTable({
  page,
  pageSize = 10,
  search,
  includeArchived = false,
  canManage,
  onPageChange,
  onEdit,
}: CategoriesTableProps) {
  const { data: categories, meta, isLoading, error, refetch } = useCategoriesQuery({
    page,
    pageSize,
    includeArchived,
  });
  const archiveCategory = useArchiveCategory();

  const handleArchive = async (cat: Category) => {
    try {
      await archiveCategory.mutateAsync(cat.id);
      toast.success(`"${cat.name}" archived`);
    } catch {
      // error toast handled by hook
    }
  };

  const filtered = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.code.toLowerCase().includes(q) ||
        (cat.description || '').toLowerCase().includes(q) ||
        (cat.parent?.name || '').toLowerCase().includes(q),
    );
  }, [categories, search]);

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Category',
      render: (cat) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-[14px] bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100/50 group-hover:scale-105 transition-transform">
            <Tags size={18} />
          </div>
          <div className="flex flex-col">
            {cat.parent && (
              <span className="text-xs text-slate-400 font-medium">{cat.parent.name} ▸</span>
            )}
            <span className="font-bold text-[var(--text-primary)]">{cat.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      render: (cat) => <span className="font-mono text-xs text-slate-500">{cat.code}</span>,
    },
    {
      key: 'taxRate',
      header: 'Tax Rate',
      render: (cat) =>
        cat.taxRate ? (
          <span className="text-slate-600 text-sm">
            {cat.taxRate.name}{' '}
            <span className="text-slate-400">({cat.taxRate.rate}%)</span>
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (cat) => <span className="text-slate-500">{cat.description || '—'}</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (cat) => (
        <Badge variant={cat.isActive ? 'success' : 'warning'}>
          {cat.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (cat) => (
        <span className="text-slate-500 font-medium">{new Date(cat.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]',
      className: 'p-5 text-right',
      render: (cat) =>
        canManage ? (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(cat)}
              className="h-8 w-8 !p-0"
              title="Edit"
              aria-label="Edit"
            >
              <Edit size={14} className="text-slate-400 hover:text-indigo-500" />
            </Button>
            {cat.isActive && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void handleArchive(cat)}
                className="h-8 w-8 !p-0"
                disabled={archiveCategory.isPending}
                title="Archive"
                aria-label="Archive"
              >
                <Archive size={14} className="text-slate-400 hover:text-rose-500" />
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <div className="glass-panel overflow-hidden">
      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error ? 'Failed to load categories' : null}
        onRetry={() => void refetch()}
        rowKey={(cat) => cat.id}
        empty="No categories found."
      />
      <TablePagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={pageSize}
        shown={filtered.length}
        onPageChange={onPageChange}
      />
    </div>
  );
}
