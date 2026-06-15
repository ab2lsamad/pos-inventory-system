'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import FormField from '@/components/ui/FormField';
import Switch from '@/components/ui/Switch';
import { brandSchema } from '@/schemas/brand';
import type { BrandFormData } from '@/schemas/brand';
import type { Brand, CreateBrandPayload } from '@/types/brand';
import { useCreateBrand } from '@/hooks/brands/useCreateBrand';
import { useUpdateBrand } from '@/hooks/brands/useUpdateBrand';

interface BrandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: Brand | null;
}

const defaults: BrandFormData = {
  name: '',
  description: '',
  isActive: true,
};

export default function BrandFormModal({ isOpen, onClose, brand }: BrandFormModalProps) {
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const isPending = createBrand.isPending || updateBrand.isPending;

  const form = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      brand
        ? {
            name: brand.name,
            description: brand.description ?? '',
            isActive: brand.isActive,
          }
        : defaults,
    );
  }, [isOpen, brand, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: CreateBrandPayload = {
      name: values.name,
      isActive: values.isActive,
    };
    if (values.description) payload.description = values.description;

    try {
      if (brand) {
        await updateBrand.mutateAsync({ id: brand.id, payload });
        toast.success('Brand updated');
      } else {
        await createBrand.mutateAsync(payload);
        toast.success('Brand created');
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
      title={brand ? 'Edit Brand' : 'New Brand'}
      formId="brand-form"
      onCancel={onClose}
      isLoading={isPending}
      confirmLabel={brand ? 'Update' : 'Create'}
    >
      <form id="brand-form" onSubmit={onSubmit} className="space-y-4">
        <FormField<BrandFormData>
          name="name"
          control={form.control}
          label="Name"
          placeholder="Brand name"
        />
        <FormField<BrandFormData>
          name="description"
          control={form.control}
          label="Description"
          placeholder="Optional description"
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
      </form>
    </Modal>
  );
}
