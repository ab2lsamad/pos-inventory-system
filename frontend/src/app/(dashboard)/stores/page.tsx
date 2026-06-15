'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import PageLayout from '@/components/layout/PageLayout';
import StoresTable from '@/components/stores/StoresTable';
import StoreFormModal from '@/components/stores/StoreFormModal';
import type { Store } from '@/types/store';

export default function StoresPage() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Store | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (store: Store) => {
    setEditing(store);
    setIsModalOpen(true);
  };

  return (
    <PageLayout
      title="Stores"
      description="Manage your store locations"
      action={
        <div className="flex items-center gap-3">
          <Switch
            checked={showArchived}
            onChange={(val) => {
              setShowArchived(val);
              setPage(1);
            }}
            label="Show archived"
          />
          <Button onClick={openCreate} id="create-store-btn">
            <Plus size={16} />
            Add Store
          </Button>
        </div>
      }
    >
      <div className="flex flex-col section-gap">
        <StoresTable
          page={page}
          onPageChange={setPage}
          onEdit={openEdit}
          includeArchived={showArchived}
        />
        <StoreFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          store={editing}
        />
      </div>
    </PageLayout>
  );
}
