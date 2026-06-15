'use client';

import { useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import PageLayout from '@/components/layout/PageLayout';
import BrandsTable from '@/components/brands/BrandsTable';
import BrandFormModal from '@/components/brands/BrandFormModal';
import { useAuthStore } from '@/store/auth-store';
import { canWriteOnRoute } from '@/lib/route-access';
import type { Brand } from '@/types/brand';

export default function BrandsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = canWriteOnRoute(role, '/brands');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setIsModalOpen(true);
  };

  return (
    <PageLayout
      title="Brands"
      description="Manage product brands"
      action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus size={16} />
              Add Brand
            </Button>
          )
      }
    >
      <div className="flex flex-col section-gap">
        <div className="flex items-center gap-4">
          <div className="w-64">
            <Input
              placeholder="Search brands…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              icon={<Tag size={16} />}
              id="brand-search"
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
        <BrandsTable
          page={page}
          search={search}
          includeArchived={showArchived}
          canManage={canManage}
          onPageChange={setPage}
          onEdit={openEdit}
        />
        <BrandFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          brand={editing}
        />
      </div>
    </PageLayout>
  );
}
