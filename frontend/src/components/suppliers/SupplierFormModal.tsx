'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useController } from 'react-hook-form';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import FormField from '@/components/ui/FormField';
import PhoneFormField from '@/components/ui/PhoneFormField';
import Switch from '@/components/ui/Switch';
import { supplierSchema } from '@/schemas/supplier';
import type { SupplierFormData } from '@/schemas/supplier';
import type { Supplier, CreateSupplierPayload } from '@/types/supplier';
import { useCreateSupplier } from '@/hooks/suppliers/useCreateSupplier';
import { useUpdateSupplier } from '@/hooks/suppliers/useUpdateSupplier';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

const defaults: SupplierFormData = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  taxId: '',
  isActive: true,
};

function IsActiveField({ control }: { control: ReturnType<typeof useForm<SupplierFormData>>['control'] }) {
  const { field } = useController({ name: 'isActive', control });
  return (
    <Switch
      checked={field.value}
      onChange={field.onChange}
      label="Active"
    />
  );
}

export default function SupplierFormModal({ isOpen, onClose, supplier }: SupplierFormModalProps) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const isPending = createSupplier.isPending || updateSupplier.isPending;

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      supplier
        ? {
            name: supplier.name,
            contactPerson: supplier.contactPerson ?? '',
            email: supplier.email ?? '',
            phone: supplier.phone ?? '',
            address: supplier.address ?? '',
            taxId: supplier.taxId ?? '',
            isActive: supplier.isActive,
          }
        : defaults,
    );
  }, [isOpen, supplier, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: CreateSupplierPayload = {
      name: values.name,
      isActive: values.isActive,
    };
    if (values.contactPerson) payload.contactPerson = values.contactPerson;
    if (values.email) payload.email = values.email;
    if (values.phone) payload.phone = values.phone;
    if (values.address) payload.address = values.address;
    if (values.taxId) payload.taxId = values.taxId;

    try {
      if (supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, payload });
        toast.success('Supplier updated');
      } else {
        await createSupplier.mutateAsync(payload);
        toast.success('Supplier created');
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
      title={supplier ? 'Edit Supplier' : 'New Supplier'}
      formId="supplier-form"
      onCancel={onClose}
      isLoading={isPending}
      confirmLabel={supplier ? 'Update' : 'Create'}
    >
      <form id="supplier-form" onSubmit={onSubmit} className="space-y-4">
        <FormField<SupplierFormData>
          name="name"
          control={form.control}
          label="Name"
          placeholder="e.g. Acme Distributors"
        />
        <FormField<SupplierFormData>
          name="contactPerson"
          control={form.control}
          label="Contact Person"
          placeholder="Full name of contact"
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField<SupplierFormData>
            name="email"
            control={form.control}
            label="Email"
            placeholder="contact@supplier.com"
            type="email"
          />
          <PhoneFormField<SupplierFormData>
            name="phone"
            control={form.control}
            label="Phone"
            placeholder="+92 300 0000000"
          />
        </div>
        <FormField<SupplierFormData>
          name="address"
          control={form.control}
          label="Address"
          placeholder="Street, City, Country"
        />
        <FormField<SupplierFormData>
          name="taxId"
          control={form.control}
          label="Tax ID / NTN"
          placeholder="Optional tax identifier"
        />
        <IsActiveField control={form.control} />
      </form>
    </Modal>
  );
}
