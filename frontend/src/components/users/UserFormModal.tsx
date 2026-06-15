'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import FormField from '@/components/ui/FormField';
import PhoneFormField from '@/components/ui/PhoneFormField';
import FormSelect from '@/components/ui/FormSelect';
import { userSchema, type UserFormData } from '@/schemas/user';
import { Role } from '@/types/shared';
import type { CreateUserDto, UpdateUserDto, User } from '@/types/user';
import { useCreateUser } from '@/hooks/users/useCreateUser';
import { useUpdateUser } from '@/hooks/users/useUpdateUser';
import { useStoresQuery } from '@/hooks/stores/useStoresQuery';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const emptyForm: UserFormData = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  role: Role.CASHIER,
  storeId: '',
  isActive: true,
  baseSalary: '0.00',
  commissionPercent: '0.00',
  compensationStartDate: '',
  isCompensationEnabled: true,
  editingId: undefined,
};

// Salary applies to every non-admin role; commission is earned only by the
// EMPLOYEE role (sales people credited on orders). Admins are never on payroll.
const canConfigureCompensation = (role: Role) => role !== Role.ADMIN;
const canConfigureCommission = (role: Role) => role === Role.EMPLOYEE;

export default function UserFormModal({ isOpen, onClose, user }: UserFormModalProps) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const isPending = createUser.isPending || updateUser.isPending;

  const { data: stores } = useStoresQuery({ page: 1, pageSize: 100 });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: emptyForm,
  });

  const role = useWatch({ control: form.control, name: 'role' });
  const storeId = useWatch({ control: form.control, name: 'storeId' });
  const showCompensation = canConfigureCompensation(role);
  const showCommission = canConfigureCommission(role);

  const selectedStore = stores.find((s) => s.id === storeId);
  const currency = selectedStore?.currency ?? '';

  useEffect(() => {
    if (!isOpen) return;
    if (user) {
      form.reset({
        fullName: user.fullName,
        email: user.email,
        password: '',
        phone: user.phone || '',
        role: user.role,
        storeId: user.storeId || '',
        isActive: user.isActive ?? true,
        baseSalary: String(user.baseSalary ?? '0.00'),
        commissionPercent: String(user.commissionPercent ?? 0),
        compensationStartDate: user.compensationStartDate
          ? user.compensationStartDate.slice(0, 10)
          : '',
        isCompensationEnabled: user.isCompensationEnabled ?? true,
        editingId: user.id,
      });
    } else {
      form.reset(emptyForm);
    }
  }, [isOpen, user, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const include = canConfigureCompensation(values.role);
    const baseSalary = include ? Number(values.baseSalary) : 0;
    // Commission is EMPLOYEE-only; the backend also forces 0 for other roles.
    const commissionPercent = canConfigureCommission(values.role)
      ? Number(values.commissionPercent)
      : 0;
    const compensationStartDate =
      include && values.compensationStartDate ? values.compensationStartDate : undefined;
    const isCompensationEnabled = include ? values.isCompensationEnabled : false;

    try {
      if (user) {
        const payload: UpdateUserDto = {
          fullName: values.fullName,
          email: values.email,
          phone: values.phone || undefined,
          role: values.role,
          storeId: values.storeId || undefined,
          isActive: values.isActive,
          baseSalary,
          commissionPercent,
          compensationStartDate,
          isCompensationEnabled,
        };
        await updateUser.mutateAsync({ id: user.id, payload });
        toast.success('User updated');
      } else {
        const payload: CreateUserDto = {
          fullName: values.fullName,
          email: values.email,
          password: values.password,
          phone: values.phone || undefined,
          role: values.role,
          storeId: values.storeId || undefined,
          isActive: values.isActive,
          baseSalary,
          commissionPercent,
          compensationStartDate,
          isCompensationEnabled,
        };
        await createUser.mutateAsync(payload);
        toast.success('User created');
      }
      onClose();
    } catch {
      // error toast handled by hook
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit User' : 'Create User'}
      formId="user-form"
      onCancel={onClose}
      isLoading={isPending}
      confirmLabel={user ? 'Update' : 'Create'}
    >
      <form id="user-form" onSubmit={onSubmit} className="space-y-4">
        <FormField<UserFormData>
          name="fullName"
          control={form.control}
          label="Full Name"
          placeholder="Jane Smith"
        />
        <FormField<UserFormData>
          name="email"
          control={form.control}
          label="Email"
          type="email"
          placeholder="user@example.com"
        />
        <PhoneFormField<UserFormData>
          name="phone"
          control={form.control}
          label="Phone (optional)"
          placeholder="+92 300 0000000"
        />
        {!user && (
          <FormField<UserFormData>
            name="password"
            control={form.control}
            label="Password"
            type="password"
            placeholder="Secure password"
          />
        )}
        <FormSelect<UserFormData>
          name="role"
          control={form.control}
          label="Role"
          options={[
            { value: Role.CASHIER, label: 'Cashier' },
            { value: Role.EMPLOYEE, label: 'Employee' },
            // Manager is deprecated and hidden for new users, but kept selectable
            // when editing an existing manager so their role isn't silently lost.
            ...(user?.role === Role.MANAGER
              ? [{ value: Role.MANAGER, label: 'Manager' }]
              : []),
          ]}
        />
        <FormSelect<UserFormData>
          name="storeId"
          control={form.control}
          label="Store"
          options={[
            { value: '', label: 'No store assigned' },
            ...stores.map((store) => ({ value: store.id, label: store.name })),
          ]}
        />
        <label className="flex items-center justify-between rounded-2xl border border-[var(--border-glass)] bg-white/90 px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-[var(--text-secondary)]">Active</span>
            <span className="block text-xs text-[var(--text-muted)]">
              Inactive users cannot log in.
            </span>
          </span>
          <input
            type="checkbox"
            {...form.register('isActive')}
            className="h-4 w-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
          />
        </label>
        {showCompensation ? (
          <>
            <FormField<UserFormData>
              name="baseSalary"
              control={form.control}
              label={currency ? `Monthly Salary (${currency})` : 'Monthly Salary'}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
            />
            {showCommission && (
              <FormField<UserFormData>
                name="commissionPercent"
                control={form.control}
                label="Commission % of Sales"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0.00"
              />
            )}
            <FormField<UserFormData>
              name="compensationStartDate"
              control={form.control}
              label="Compensation Start Date"
              type="date"
            />
            <label className="flex items-center justify-between rounded-2xl border border-[var(--border-glass)] bg-white/90 px-4 py-3">
              <span>
                <span className="block text-sm font-semibold text-[var(--text-secondary)]">
                  Compensation Enabled
                </span>
                <span className="block text-xs text-[var(--text-muted)]">
                  Include this employee in payroll calculations.
                </span>
              </span>
              <input
                type="checkbox"
                {...form.register('isCompensationEnabled')}
                className="h-4 w-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
              />
            </label>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border-glass)] bg-[var(--bg-muted)]/70 px-4 py-3 text-sm text-[var(--text-secondary)]">
            Admin accounts are not included in payroll.
          </div>
        )}
      </form>
    </Modal>
  );
}
