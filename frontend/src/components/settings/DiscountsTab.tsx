'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Edit, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import FormField from '@/components/ui/FormField';
import FormSelect from '@/components/ui/FormSelect';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Switch from '@/components/ui/Switch';
import MultiSearchableSelect from '@/components/ui/MultiSearchableSelect';
import BarcodeScanInput from '@/components/ui/BarcodeScanInput';
import type { SearchableSelectItem } from '@/components/ui/SearchableSelect';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { Product } from '@/types/product';
import { discountSchema, type DiscountFormData } from '@/schemas/discount';
import { useDiscountsList } from '@/hooks/settings/useDiscountsList';
import { useCreateDiscount } from '@/hooks/settings/useCreateDiscount';
import { useUpdateDiscount } from '@/hooks/settings/useUpdateDiscount';
import { useArchiveDiscount } from '@/hooks/settings/useArchiveDiscount';
import type { Discount, CreateDiscountPayload } from '@/types/discount';
import { DiscountScope, DiscountType } from '@/types/shared';

function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string {
  return new Date(local).toISOString();
}

const TYPE_OPTIONS = [
  { value: DiscountType.PERCENTAGE, label: 'Percentage (%)' },
  { value: DiscountType.FIXED_AMOUNT, label: 'Fixed Amount' },
];

const SCOPE_OPTIONS = [
  { value: DiscountScope.ORDER, label: 'Order' },
  { value: DiscountScope.LINE_ITEM, label: 'Line Item' },
];

const defaults: DiscountFormData = {
  code: '',
  name: '',
  type: DiscountType.PERCENTAGE,
  value: '',
  scope: DiscountScope.ORDER,
  variantIds: [],
  maxUses: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

const variantItemLabel = (productName: string, variantName: string, sku: string) =>
  `${productName} — ${variantName} (${sku})`;

// Search products and flatten their active variants into pickable items so a
// line-item discount can be pinned to specific SKUs. There is no standalone
// variant-search endpoint, so we reuse the products list.
async function fetchVariantItems(search: string): Promise<SearchableSelectItem[]> {
  const res = await api.get<{ data: Product[] }>(
    API_ENDPOINTS.products.list(1, 20, search ? { search } : undefined),
  );
  const products = res.data?.data ?? [];
  return products.flatMap((p) =>
    (p.variants ?? [])
      .filter((v) => v.isActive)
      .map((v) => ({ value: v.id, label: variantItemLabel(p.name, v.name, v.sku) })),
  );
}

function DiscountModal({
  isOpen,
  onClose,
  discount,
}: {
  isOpen: boolean;
  onClose: () => void;
  discount: Discount | null;
}) {
  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();
  const isPending = createDiscount.isPending || updateDiscount.isPending;

  // Labels for variants pulled in via a barcode scan, so their chips render
  // with a readable name even though they were never in a search result list.
  const [scannedItems, setScannedItems] = useState<SearchableSelectItem[]>([]);

  const form = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: defaults,
  });

  // Reset the scanned-chip list when the modal transitions to open. Done during
  // render (not in an effect) to avoid cascading re-renders.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setScannedItems([]);
  }

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      discount
        ? {
            code: discount.code,
            name: discount.name,
            type: discount.type,
            value: discount.value,
            scope: discount.scope,
            variantIds: discount.targetVariants?.map((t) => t.variantId) ?? [],
            maxUses: discount.maxUses != null ? String(discount.maxUses) : '',
            startsAt: isoToLocalInput(discount.startsAt),
            endsAt: isoToLocalInput(discount.endsAt),
            isActive: discount.isActive,
          }
        : defaults,
    );
  }, [isOpen, discount, form]);

  // Chips for variants already pinned on the discount being edited, so they
  // render with labels before any search runs.
  const selectedVariantItems: SearchableSelectItem[] = [
    ...(discount?.targetVariants?.map((t) => ({
      value: t.variantId,
      label: variantItemLabel(t.variant.product.name, t.variant.name, t.variant.sku),
    })) ?? []),
    ...scannedItems,
  ];

  const handleVariantScan = (current: string[]) => (
    result: import('@/components/ui/BarcodeScanInput').BarcodeScanResult,
  ): string | void => {
    const { product, variant } = result;
    if (current.includes(variant.id)) {
      return `${product.name} — ${variant.name} is already selected`;
    }
    form.setValue('variantIds', [...current, variant.id], {
      shouldValidate: true,
    });
    setScannedItems((prev) =>
      prev.some((i) => i.value === variant.id)
        ? prev
        : [
            ...prev,
            {
              value: variant.id,
              label: variantItemLabel(product.name, variant.name, variant.sku),
            },
          ],
    );
  };

  const scope = useWatch({ control: form.control, name: 'scope' });

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: CreateDiscountPayload = {
      code: values.code.toUpperCase(),
      name: values.name,
      type: values.type,
      value: values.value,
      scope: values.scope,
      isActive: values.isActive,
    };
    // Variant targeting is line-item only; for ORDER scope we omit it (the API
    // clears any existing targets on update).
    if (values.scope === DiscountScope.LINE_ITEM) {
      payload.variantIds = values.variantIds ?? [];
    }
    if (values.maxUses && values.maxUses.trim() !== '') {
      const n = parseInt(values.maxUses, 10);
      if (!isNaN(n) && n > 0) payload.maxUses = n;
    }
    if (values.startsAt) payload.startsAt = localInputToIso(values.startsAt);
    if (values.endsAt) payload.endsAt = localInputToIso(values.endsAt);

    try {
      if (discount) {
        await updateDiscount.mutateAsync({ id: discount.id, payload });
        toast.success('Discount updated');
      } else {
        await createDiscount.mutateAsync(payload);
        toast.success('Discount created');
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
      title={discount ? 'Edit Discount' : 'New Discount'}
      maxWidth="max-w-xl"
      formId="discount-form"
      onCancel={onClose}
      isLoading={isPending}
      confirmLabel={discount ? 'Update' : 'Create'}
    >
      <form id="discount-form" onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="code"
            control={form.control}
            render={({ field, fieldState }) => (
              <Input
                id="discount-code"
                ref={field.ref}
                label="Code"
                placeholder="SUMMER20"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                style={{ textTransform: 'uppercase' }}
                autoCapitalize="characters"
                spellCheck={false}
              />
            )}
          />
          <FormField<DiscountFormData> name="name" control={form.control} label="Name" placeholder="Summer Sale 20%" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormSelect<DiscountFormData> name="type" control={form.control} label="Type" options={TYPE_OPTIONS} />
          <FormField<DiscountFormData> name="value" control={form.control} label="Value" placeholder="e.g. 20 or 150.00" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormSelect<DiscountFormData> name="scope" control={form.control} label="Scope" options={SCOPE_OPTIONS} />
          <FormField<DiscountFormData> name="maxUses" control={form.control} label="Max Uses (optional)" placeholder="Leave blank for unlimited" type="number" />
        </div>
        {scope === DiscountScope.LINE_ITEM && (
          <Controller
            name="variantIds"
            control={form.control}
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <MultiSearchableSelect
                  id="discount-variants"
                  label="Apply to products (optional)"
                  placeholder="Search products / variants…"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  fetchItems={fetchVariantItems}
                  selectedItems={selectedVariantItems}
                  error={fieldState.error?.message}
                />
                <BarcodeScanInput
                  id="discount-variant-scan"
                  placeholder="Scan barcode to add a variant…"
                  successVerb="Added"
                  onScan={handleVariantScan(field.value ?? [])}
                />
                <p className="text-[11px] text-slate-400">
                  Leave empty to allow this discount on any product. Selected variants
                  restrict it to those SKUs only.
                </p>
              </div>
            )}
          />
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField<DiscountFormData> name="startsAt" control={form.control} label="Starts At (optional)" type="datetime-local" />
          <FormField<DiscountFormData> name="endsAt" control={form.control} label="Ends At (optional)" type="datetime-local" />
        </div>
        <Controller
          name="isActive"
          control={form.control}
          render={({ field }) => (
            <Switch id="discount-isActive" checked={field.value} onChange={field.onChange} label="Active" />
          )}
        />
      </form>
    </Modal>
  );
}

export default function DiscountsTab() {
  const [page, setPage] = useState(1);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);

  const { data, meta, isLoading, error, refetch } = useDiscountsList({ page, includeArchived });
  const archiveDiscount = useArchiveDiscount();

  const handleArchive = async (discount: Discount) => {
    try {
      await archiveDiscount.mutateAsync(discount.id);
      toast.success(`"${discount.name}" archived`);
    } catch {
      // error toast handled by hook
    }
  };

  const columns: Column<Discount>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (d) => (
        <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
          {d.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (d) => <span className="font-semibold text-[var(--text-primary)]">{d.name}</span>,
    },
    {
      key: 'type',
      header: 'Type / Value',
      render: (d) => (
        <span className="text-sm text-slate-600">
          {d.type === DiscountType.PERCENTAGE ? `${d.value}%` : `PKR ${d.value}`}
        </span>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      render: (d) => (
        <span className="text-xs font-medium text-slate-500 capitalize">{d.scope.toLowerCase().replace('_', ' ')}</span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (d) => (
        <span className="text-sm text-slate-600">
          {d.usageCount}{d.maxUses ? ` / ${d.maxUses}` : ''}
        </span>
      ),
    },
    {
      key: 'window',
      header: 'Active Window',
      render: (d) => {
        if (!d.startsAt && !d.endsAt) return <span className="text-slate-400 text-xs">Always</span>;
        const fmt = (s: string) => new Date(s).toLocaleDateString();
        return (
          <span className="text-xs text-slate-600">
            {d.startsAt ? fmt(d.startsAt) : '∞'} – {d.endsAt ? fmt(d.endsAt) : '∞'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <Badge variant={d.isActive ? 'success' : 'warning'}>
          {d.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right p-5 font-semibold text-slate-500 uppercase tracking-widest text-[11px]',
      className: 'p-5 text-right',
      render: (d) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={() => { setEditing(d); setIsModalOpen(true); }} className="h-8 w-8 !p-0" title="Edit" aria-label="Edit">
            <Edit size={14} className="text-slate-400 hover:text-indigo-500" />
          </Button>
          {!d.isActive ? null : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void handleArchive(d)}
              className="h-8 w-8 !p-0"
              disabled={archiveDiscount.isPending}
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
          Add Discount
        </Button>
      </div>

      <div className="glass-panel overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          loading={isLoading}
          error={error ? 'Failed to load discounts' : null}
          onRetry={() => void refetch()}
          rowKey={(d) => d.id}
          empty="No discounts found."
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

      <DiscountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} discount={editing} />
    </div>
  );
}
