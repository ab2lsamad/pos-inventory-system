'use client';

import { useState } from 'react';
import { Plus, Tags } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import PageLayout from '@/components/layout/PageLayout';
import CategoriesTable from '@/components/categories/CategoriesTable';
import CategoryFormModal from '@/components/categories/CategoryFormModal';
import { canWrite } from '@/lib/route-access';
import { useAuthStore } from '@/store/auth-store';
import type { Category } from '@/types/category';

export default function CategoriesPage() {
  const userRole = useAuthStore((state) => state.user?.role);
  const canManageCategories = canWrite(userRole);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setIsModalOpen(true);
  };

  return (
    <PageLayout
      title="Categories"
      description="Manage product categories"
      action={
        canManageCategories ? (
          <Button onClick={openCreate} id="create-category-btn">
            <Plus size={16} />
            Add Category
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col section-gap">
        <div className="flex items-center gap-4">
          <div className="w-64">
            <Input
              placeholder="Search name, code, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Tags size={16} />}
              id="category-search"
            />
          </div>
          <Switch
            checked={includeArchived}
            onChange={(val) => {
              setIncludeArchived(val);
              setPage(1);
            }}
            label="Show archived"
          />
        </div>

        <CategoriesTable
          page={page}
          search={search}
          includeArchived={includeArchived}
          canManage={canManageCategories}
          onPageChange={setPage}
          onEdit={openEdit}
        />

        {canManageCategories ? (
          <CategoryFormModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            category={editing}
          />
        ) : null}
      </div>
    </PageLayout>
  );
}
