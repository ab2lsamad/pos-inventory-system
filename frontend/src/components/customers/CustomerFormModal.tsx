'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import FormField from '@/components/ui/FormField';
import PhoneFormField from '@/components/ui/PhoneFormField';
import Switch from '@/components/ui/Switch';
import { customerSchema } from '@/schemas/customer';
import type { CustomerFormData } from '@/schemas/customer';
import type { Customer, CreateCustomerPayload } from '@/types/customer';
import { useCreateCustomer } from '@/hooks/customers/useCreateCustomer';
import { useUpdateCustomer } from '@/hooks/customers/useUpdateCustomer';
import { fetchAllCustomers } from '@/hooks/customers/useCustomersQuery';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  // Called with the customer that was created (or, when resolveExistingByPhone
  // is set, the pre-existing customer matched by phone). Lets callers like the
  // POS cart immediately select the customer.
  onCreated?: (customer: Customer) => void;
  // When creating, if a customer with the same phone already exists, select that
  // existing customer instead of creating a duplicate.
  resolveExistingByPhone?: boolean;
}

// Strip everything but digits so "+92 300 1234567" and "923001234567" match.
const phoneDigits = (phone?: string | null) => (phone ?? '').replace(/\D/g, '');

const defaults: CustomerFormData = {
  name: '',
  phone: '',
  email: '',
  notes: '',
  isActive: true,
};

export default function CustomerFormModal({
  isOpen,
  onClose,
  customer,
  onCreated,
  resolveExistingByPhone = false,
}: CustomerFormModalProps) {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isPending = createCustomer.isPending || updateCustomer.isPending;

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      customer
        ? {
            name: customer.fullName,
            phone: customer.phone ?? '',
            email: customer.email ?? '',
            notes: customer.notes ?? '',
            isActive: customer.isActive,
          }
        : defaults,
    );
  }, [isOpen, customer, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: CreateCustomerPayload = { fullName: values.name };
    if (values.phone) payload.phone = values.phone;
    if (values.email) payload.email = values.email;
    if (values.notes) payload.notes = values.notes;

    try {
      if (customer) {
        await updateCustomer.mutateAsync({ id: customer.id, payload: { ...payload, isActive: values.isActive } });
        toast.success('Customer updated');
      } else {
        if (resolveExistingByPhone && payload.phone) {
          const matches = await fetchAllCustomers(payload.phone);
          const existing = matches.find(
            (c) => phoneDigits(c.phone) === phoneDigits(payload.phone),
          );
          if (existing) {
            toast.success('Existing customer with this phone selected');
            onCreated?.(existing);
            onClose();
            return;
          }
        }
        const created = await createCustomer.mutateAsync(payload);
        toast.success('Customer created');
        onCreated?.(created);
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
      title={customer ? 'Edit Customer' : 'New Customer'}
      formId="customer-form"
      onCancel={onClose}
      isLoading={isPending}
      confirmLabel={customer ? 'Update' : 'Create'}
    >
      <form id="customer-form" onSubmit={onSubmit} className="space-y-4">
        <FormField<CustomerFormData>
          name="name"
          control={form.control}
          label="Full Name"
          placeholder="Full name"
        />
        <PhoneFormField<CustomerFormData>
          name="phone"
          control={form.control}
          label="Phone"
          placeholder="+92 300 0000000"
        />
        <FormField<CustomerFormData>
          name="email"
          control={form.control}
          label="Email"
          placeholder="customer@example.com"
          type="email"
        />
        <FormField<CustomerFormData>
          name="notes"
          control={form.control}
          label="Notes"
          placeholder="Optional notes"
        />
        {customer && (
          <Controller
            name="isActive"
            control={form.control}
            render={({ field }) => (
              <Switch
                id="customer-isActive"
                checked={field.value}
                onChange={field.onChange}
                label="Active"
              />
            )}
          />
        )}
      </form>
    </Modal>
  );
}
