'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import FormField from '@/components/ui/FormField';
import PhoneFormField from '@/components/ui/PhoneFormField';
import Switch from '@/components/ui/Switch';
import { Controller } from 'react-hook-form';
import { storeSchema } from '@/schemas/store';
import type { StoreFormData } from '@/schemas/store';
import type { CreateStorePayload, Store } from '@/types/store';
import { useCreateStore } from '@/hooks/stores/useCreateStore';
import { useUpdateStore } from '@/hooks/stores/useUpdateStore';

interface StoreFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store | null;
}

const defaults: StoreFormData = {
  code: '',
  name: '',
  currency: 'PKR',
  location: '',
  phone: '',
  isActive: true,
};

export default function StoreFormModal({ isOpen, onClose, store }: StoreFormModalProps) {
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const isPending = createStore.isPending || updateStore.isPending;

  const form = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      store
        ? {
            code: store.code,
            name: store.name,
            currency: store.currency,
            location: store.location ?? '',
            phone: store.phone ?? '',
            isActive: store.isActive,
          }
        : defaults,
    );
  }, [isOpen, store, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: CreateStorePayload = {
      code: values.code,
      name: values.name,
      currency: values.currency,
      isActive: values.isActive,
    };
    if (values.location) payload.location = values.location;
    if (values.phone) payload.phone = values.phone;

    try {
      if (store) {
        await updateStore.mutateAsync({ id: store.id, payload });
        toast.success('Store updated');
      } else {
        await createStore.mutateAsync(payload);
        toast.success('Store created');
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
      title={store ? 'Edit Store' : 'New Store'}
      formId="store-form"
      onCancel={onClose}
      isLoading={isPending}
      confirmLabel={store ? 'Update' : 'Create'}
    >
      <form id="store-form" onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField<StoreFormData>
            name="code"
            control={form.control}
            label="Code"
            placeholder="e.g. LHR-01"
          />
          <FormField<StoreFormData>
            name="name"
            control={form.control}
            label="Name"
            placeholder="Store name"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField<StoreFormData>
            name="currency"
            control={form.control}
            label="Currency"
            placeholder="PKR"
          />
          <PhoneFormField<StoreFormData>
            name="phone"
            control={form.control}
            label="Phone"
            placeholder="+923001234567"
          />
        </div>
        <FormField<StoreFormData>
          name="location"
          control={form.control}
          label="Location"
          placeholder="Store location (optional)"
        />
        <Controller
          name="isActive"
          control={form.control}
          render={({ field }) => (
            <Switch
              id="isActive"
              checked={field.value}
              onChange={field.onChange}
              label="Active"
            />
          )}
        />
        {store && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Receipt Counter:</span>{' '}
            <span className="font-mono">{store.receiptCounter}</span>
            <span className="text-slate-400 ml-1">(read-only, managed by server)</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
