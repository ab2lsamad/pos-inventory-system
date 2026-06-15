'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Edit, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import FormField from '@/components/ui/FormField';
import Modal from '@/components/ui/Modal';
import Switch from '@/components/ui/Switch';
import { Controller } from 'react-hook-form';
import { taxRateSchema, type TaxRateFormData } from '@/schemas/tax-rate';
import { useTaxRatesList } from '@/hooks/settings/useTaxRatesList';
import { useCreateTaxRate } from '@/hooks/settings/useCreateTaxRate';
import { useUpdateTaxRate } from '@/hooks/settings/useUpdateTaxRate';
import { useArchiveTaxRate } from '@/hooks/settings/useArchiveTaxRate';
import type { TaxRate } from '@/types/tax-rate';

const defaults: TaxRateFormData = { name: '', rate: '', isActive: true };

function TaxRateModal({
  isOpen,
  onClose,
  taxRate,
}: {
  isOpen: boolean;
  onClose: () => void;
  taxRate: TaxRate | null;
}) {
  const createTaxRate = useCreateTaxRate();
  const updateTaxRate = useUpdateTaxRate();
  const isPending = createTaxRate.isPending || updateTaxRate.isPending;

  const form = useForm<TaxRateFormData>({
    resolver: zodResolver(taxRateSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      taxRate
        ? { name: taxRate.name, rate: taxRate.rate, isActive: taxRate.isActive }
        : defaults,
    );
  }, [isOpen, taxRate, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (taxRate) {
        await updateTaxRate.mutateAsync({ id: taxRate.id, payload: values });
        toast.success('Tax rate updated');
      } else {
        await createTaxRate.mutateAsync(values);
        toast.success('Tax rate created');
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
      title={taxRate ? 'Edit Tax Rate' : 'New Tax Rate'}
      formId="tax-rate-form"
      onCancel={onClose}
      isLoading={isPending}
      confirmLabel={taxRate ? 'Update' : 'Create'}
    >
      <form id="tax-rate-form" onSubmit={onSubmit} className="space-y-4">
        <FormField<TaxRateFormData>
          name="name"
          control={form.control}
          label="Name"
          placeholder="e.g. Standard GST"
        />
        <FormField<TaxRateFormData>
          name="rate"
          control={form.control}
          label="Rate (%)"
          placeholder="e.g. 17 or 17.50"
        />
        <Controller
          name="isActive"
          control={form.control}
          render={({ field }) => (
            <Switch id="taxRate-isActive" checked={field.value} onChange={field.onChange} label="Active" />
          )}
        />
      </form>
    </Modal>
  );
}

export default function TaxRatesTab() {
  const [page, setPage] = useState(1);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);

  const { data, meta, isLoading, error, refetch } = useTaxRatesList({ page, includeArchived });
  const archiveTaxRate = useArchiveTaxRate();

  const handleArchive = async (taxRate: TaxRate) => {
    try {
      await archiveTaxRate.mutateAsync(taxRate.id);
      toast.success(`"${taxRate.name}" archived`);
    } catch {
      // error toast handled by hook
    }
  };

  const columns: Column<TaxRate>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (t) => <span className="font-semibold text-[var(--text-primary)]">{t.name}</span>,
    },
    {
      key: 'rate',
      header: 'Rate',
      render: (t) => <span className="font-mono text-sm font-medium text-slate-600">{t.rate}%</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (t) => (
        <Badge variant={t.isActive ? 'success' : 'warning'}>
          {t.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]',
      className: 'p-5 text-right',
      render: (t) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setIsModalOpen(true); }} className="h-8 w-8 !p-0" title="Edit" aria-label="Edit">
            <Edit size={14} className="text-slate-400 hover:text-indigo-500" />
          </Button>
          {t.isActive && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void handleArchive(t)}
              className="h-8 w-8 !p-0"
              disabled={archiveTaxRate.isPending}
              title="Archive"
              aria-label="Archive"
            >
              <Archive size={14} className="text-slate-400 hover:text-rose-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Switch
          checked={includeArchived}
          onChange={(val) => {
            setIncludeArchived(val);
            setPage(1);
          }}
          label="Show archived"
        />
        <Button onClick={() => { setEditing(null); setIsModalOpen(true); }}>
          <Plus size={16} />
          Add Tax Rate
        </Button>
      </div>

      <div className="glass-panel overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          loading={isLoading}
          error={error ? 'Failed to load tax rates' : null}
          onRetry={() => void refetch()}
          rowKey={(t) => t.id}
          empty="No tax rates found."
        />
        <div className="px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
          {meta.total} total · Page {meta.page} of {Math.max(meta.totalPages, 1)}
          {meta.totalPages > 1 && (
            <span className="ml-4 space-x-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="disabled:opacity-40 hover:text-indigo-600">Prev</button>
              <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="disabled:opacity-40 hover:text-indigo-600">Next</button>
            </span>
          )}
        </div>
      </div>

      <TaxRateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} taxRate={editing} />
    </div>
  );
}
