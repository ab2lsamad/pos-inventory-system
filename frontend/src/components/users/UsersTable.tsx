'use client';

import { Edit, KeyRound, Users as UsersIcon } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import DataTable, { type Column } from '@/components/ui/DataTable';
import TablePagination from '@/components/ui/TablePagination';
import { useUsersQuery } from '@/hooks/users/useUsersQuery';
import { getRoleVariant } from '@/lib/badge-helpers';
import { Role } from '@/types/shared';
import type { User } from '@/types/user';

interface UsersTableProps {
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onEdit: (user: User) => void;
  onChangePassword: (user: User) => void;
}

const canConfigureCompensation = (role: Role) => role !== Role.ADMIN;

export default function UsersTable({
  page,
  pageSize = 10,
  onPageChange,
  onEdit,
  onChangePassword,
}: UsersTableProps) {
  const { data: users, meta, isLoading, error, refetch } = useUsersQuery({ page, pageSize });

  const columns: Column<User>[] = [
    {
      key: 'fullName',
      header: 'Full Name',
      render: (user) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-[14px] bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100/50 group-hover:scale-105 transition-transform">
            <UsersIcon size={18} />
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">{user.fullName}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (user) => (
        <span className="text-slate-500 font-medium">{user.phone || '-'}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => <Badge variant={getRoleVariant(user.role)}>{user.role}</Badge>,
    },
    {
      key: 'store',
      header: 'Store',
      render: (user) => <span className="text-slate-500 font-medium">{user.store?.name || '-'}</span>,
    },
    {
      key: 'active',
      header: 'Active',
      render: (user) => (
        <Badge variant={user.isActive ? 'success' : 'warning'}>
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'salary',
      header: 'Salary',
      render: (user) =>
        canConfigureCompensation(user.role) ? (
          <div className="space-y-1 text-slate-500 font-medium">
            <p className="font-semibold text-[var(--text-primary)]">
              {user.store?.currency ? `${user.store.currency} ` : ''}
              {Number(user.baseSalary).toFixed(2)} / mo
            </p>
            <p>{Number(user.commissionPercent).toFixed(2)}% commission</p>
          </div>
        ) : (
          <span className="text-slate-500 font-medium">-</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]',
      className: 'p-5 text-right',
      render: (user) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChangePassword(user)}
            className="h-8 w-8 !p-0"
            title="Change password"
          >
            <KeyRound size={14} className="text-slate-400 hover:text-amber-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEdit(user)} className="h-8 w-8 !p-0" title="Edit" aria-label="Edit">
            <Edit size={14} className="text-slate-400 hover:text-indigo-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="glass-panel overflow-hidden">
      <DataTable
        columns={columns}
        data={users}
        loading={isLoading}
        error={error ? 'Failed to load users' : null}
        onRetry={() => void refetch()}
        rowKey={(user) => user.id}
        empty="No users found."
      />
      <TablePagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={pageSize}
        shown={users.length}
        onPageChange={onPageChange}
      />
    </div>
  );
}
