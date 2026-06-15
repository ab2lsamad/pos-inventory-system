'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import PageLayout from '@/components/layout/PageLayout';
import UsersTable from '@/components/users/UsersTable';
import UserFormModal from '@/components/users/UserFormModal';
import UserPasswordModal from '@/components/users/UserPasswordModal';
import type { User } from '@/types/user';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setIsModalOpen(true);
  };

  const openChangePassword = (user: User) => {
    setPasswordTarget(user);
  };

  return (
    <PageLayout
      title="Users"
      description="Manage system users, store assignments, and cashier compensation settings"
      action={
        <Button onClick={openCreate} id="create-user-btn">
          <Plus size={16} />
          Add User
        </Button>
      }
    >
      <div className="flex flex-col section-gap">
        <UsersTable
          page={page}
          onPageChange={setPage}
          onEdit={openEdit}
          onChangePassword={openChangePassword}
        />
        <UserFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={editing} />
        <UserPasswordModal
          isOpen={passwordTarget !== null}
          onClose={() => setPasswordTarget(null)}
          user={passwordTarget}
        />
      </div>
    </PageLayout>
  );
}
