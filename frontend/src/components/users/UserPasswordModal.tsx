'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import FormField from '@/components/ui/FormField';
import { passwordSchema, type PasswordFormData } from '@/schemas/user';
import type { User } from '@/types/user';
import { useUpdateUser } from '@/hooks/users/useUpdateUser';

interface UserPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserPasswordModal({ isOpen, onClose, user }: UserPasswordModalProps) {
  const updateUser = useUpdateUser();

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '' },
  });

  useEffect(() => {
    if (isOpen) form.reset({ password: '' });
  }, [isOpen, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!user) return;
    try {
      await updateUser.mutateAsync({ id: user.id, payload: { password: values.password } });
      toast.success('Password updated');
      onClose();
    } catch {
      // error toast handled by hook
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Password"
      formId="password-form"
      onCancel={onClose}
      isLoading={updateUser.isPending}
      confirmLabel="Update Password"
    >
      <form id="password-form" onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          Setting a new password for <span className="font-semibold text-[var(--text-primary)]">{user?.fullName}</span>.
        </p>
        <FormField<PasswordFormData>
          name="password"
          control={form.control}
          label="New Password"
          type="password"
          placeholder="Secure password (min 6 chars)"
        />
      </form>
    </Modal>
  );
}
