'use client';

import { useState } from 'react';
import { Plus, Building2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PageLayout from '@/components/layout/PageLayout';
import SuppliersTable from '@/components/suppliers/SuppliersTable';
import SupplierFormModal from '@/components/suppliers/SupplierFormModal';
import SupplierProductsPanel from '@/components/suppliers/SupplierProductsPanel';
import { useAuthStore } from '@/store/auth-store';
import { canWriteOnRoute } from '@/lib/route-access';
import type { Supplier } from '@/types/supplier';

export default function SuppliersPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = canWriteOnRoute(role, '/suppliers');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productsSupplier, setProductsSupplier] = useState<Supplier | null>(null);
  const [isProductsOpen, setIsProductsOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setIsFormOpen(true);
  };

  const openProducts = (supplier: Supplier) => {
    setProductsSupplier(supplier);
    setIsProductsOpen(true);
  };

  return (
    <PageLayout
      title="Suppliers"
      description="Manage your supplier directory and linked products"
      action={
        canManage ? (
          <Button onClick={openCreate}>
            <Plus size={16} />
            Add Supplier
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col section-gap">
        <div className="w-64">
          <Input
            placeholder="Search suppliers…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            icon={<Building2 size={16} />}
            id="supplier-search"
          />
        </div>
        <SuppliersTable
          page={page}
          search={search}
          canManage={canManage}
          onPageChange={setPage}
          onEdit={openEdit}
          onViewProducts={openProducts}
        />
        <SupplierFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          supplier={editing}
        />
        <SupplierProductsPanel
          isOpen={isProductsOpen}
          onClose={() => setIsProductsOpen(false)}
          supplier={productsSupplier}
        />
      </div>
    </PageLayout>
  );
}
