'use client';

import { useState } from 'react';
import { Plus, User } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import PageLayout from '@/components/layout/PageLayout';
import CustomersTable from '@/components/customers/CustomersTable';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import { useAuthStore } from '@/store/auth-store';
import { canWriteOnRoute } from '@/lib/route-access';
import type { Customer } from '@/types/customer';

export default function CustomersPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = canWriteOnRoute(role, '/customers');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setIsModalOpen(true);
  };

  return (
    <PageLayout
      title="Customers"
      description="Manage your customer directory"
      action={
        canManage ? (
          <Button onClick={openCreate}>
            <Plus size={16} />
            Add Customer
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col section-gap">
        <div className="flex items-center gap-4">
          <div className="w-64">
            <Input
              placeholder="Search customers…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              icon={<User size={16} />}
              id="customer-search"
            />
          </div>
          <Switch
            checked={showArchived}
            onChange={(val) => {
              setShowArchived(val);
              setPage(1);
            }}
            label="Show archived"
          />
        </div>
        <CustomersTable
          page={page}
          search={search}
          showArchived={showArchived}
          canManage={canManage}
          onPageChange={setPage}
          onEdit={openEdit}
        />
        <CustomerFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          customer={editing}
        />
      </div>
    </PageLayout>
  );
}
