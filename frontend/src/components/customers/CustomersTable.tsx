'use client';

import { useMemo } from 'react';
import { Edit, Archive, User } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import TablePagination from '@/components/ui/TablePagination';
import { useCustomersQuery } from '@/hooks/customers/useCustomersQuery';
import { useSetCustomerActive } from '@/hooks/customers/useSetCustomerActive';
import type { Customer } from '@/types/customer';

interface CustomersTableProps {
  page: number;
  pageSize?: number;
  search: string;
  showArchived?: boolean;
  canManage: boolean;
  onPageChange: (page: number) => void;
  onEdit: (customer: Customer) => void;
}

export default function CustomersTable({
  page,
  pageSize = 10,
  search,
  showArchived = false,
  canManage,
  onPageChange,
  onEdit,
}: CustomersTableProps) {
  const { data: customers, meta, isLoading, error, refetch } = useCustomersQuery({
    page,
    pageSize,
    search: search || undefined,
    showArchived,
  });
  const setCustomerActive = useSetCustomerActive();

  const handleArchive = async (customer: Customer) => {
    try {
      await setCustomerActive.mutateAsync({ id: customer.id, isActive: false });
      toast.success(`"${customer.fullName}" archived`);
    } catch {
      // error toast handled by hook
    }
  };

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    );
  }, [customers, search]);

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (customer) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100/50 group-hover:scale-105 transition-transform">
            <User size={16} />
          </div>
          <span className="font-semibold text-[var(--text-primary)]">{customer.fullName}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (customer) => (
        <span className="text-slate-500">{customer.phone || '—'}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (customer) => (
        <span className="text-slate-500">{customer.email || '—'}</span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (customer) => (
        <span className="text-slate-400 text-sm truncate max-w-[200px] block">
          {customer.notes || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (customer) => (
        <Badge variant={customer.isActive ? 'success' : 'warning'}>
          {customer.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (customer) => (
        <span className="text-slate-500 font-medium">
          {new Date(customer.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName:
        'text-right p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]',
      className: 'p-5 text-right',
      render: (customer) =>
        canManage ? (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(customer)}
              className="h-8 w-8 !p-0"
              title="Edit"
              aria-label="Edit"
            >
              <Edit size={14} className="text-slate-400 hover:text-indigo-500" />
            </Button>
            {customer.isActive && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void handleArchive(customer)}
                className="h-8 w-8 !p-0"
                disabled={setCustomerActive.isPending}
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
        error={error ? 'Failed to load customers' : null}
        onRetry={() => void refetch()}
        rowKey={(customer) => customer.id}
        empty="No customers found."
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
