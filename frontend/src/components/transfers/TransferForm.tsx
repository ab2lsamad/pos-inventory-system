'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import BarcodeScanInput from '@/components/ui/BarcodeScanInput';
import { transferSchema } from '@/schemas/transfer';
import type { TransferFormData } from '@/schemas/transfer';
import { useCreateTransfer } from '@/hooks/transfers/useCreateTransfer';
import { useStoresQuery } from '@/hooks/stores/useStoresQuery';
import { useInventoryLevels } from '@/hooks/inventory/useInventoryLevels';
import { useAuthStore } from '@/store/auth-store';
import { Role } from '@/types/shared';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { PaginatedResponse } from '@/types/shared';
import type { InventoryLevel } from '@/types/inventory';

interface VariantResult {
  variantId: string;
  label: string;
  sku: string;
  available: number;
}

function LineItemsSection({
  form,
  fromStoreId,
}: {
  form: ReturnType<typeof useForm<TransferFormData>>;
  fromStoreId: string;
}) {
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const [variantSearch, setVariantSearch] = useState('');

  // Search the source store's stock directly. A variant can only be transferred
  // if it is in stock at the source (shipping deducts from there), and driving
  // the picker off the levels endpoint means server-side search with no cap on
  // catalog size.
  const { data: levels } = useInventoryLevels({
    storeId: fromStoreId || undefined,
    search: variantSearch || undefined,
    pageSize: 50,
    enabled: !!fromStoreId && !!variantSearch,
  });
  const results: VariantResult[] = (levels ?? []).map((l) => ({
    variantId: l.variantId,
    label: `${l.variant?.product?.name ?? '—'} — ${l.variant?.name ?? ''}`,
    sku: l.variant?.sku ?? '',
    available: l.quantity,
  }));

  // Remember each picked variant's available stock so the line item can show and
  // cap it even after the search box (and its results) change.
  const [availableById, setAvailableById] = useState<Record<string, number>>({});
  const availableOf = (variantId: string) => availableById[variantId] ?? 0;

  const items = useWatch({ control: form.control, name: 'items' });
  const addedVariantIds = new Set((items ?? []).map((i) => i.variantId).filter(Boolean));

  // Stock availability is per-store, so any variants picked for a previous
  // source store are no longer valid once the source changes — clear them.
  useEffect(() => {
    replace([]);
    setAvailableById({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromStoreId]);

  const handleVariantSelect = (r: VariantResult) => {
    if (r.available <= 0) return;
    setAvailableById((prev) => ({ ...prev, [r.variantId]: r.available }));
    append({ variantId: r.variantId, variantLabel: r.label, quantity: '1' });
    setVariantSearch('');
  };

  const handleVariantScan: React.ComponentProps<
    typeof BarcodeScanInput
  >['onScan'] = async ({ product, variant }) => {
    if (addedVariantIds.has(variant.id)) {
      return `${product.name} — ${variant.name} is already on this transfer`;
    }
    // Stock is per-store, so look up this variant's level at the source before
    // adding it — the barcode lookup alone doesn't tell us how many are on hand.
    const res = await api.get<PaginatedResponse<InventoryLevel>>(
      API_ENDPOINTS.inventory.levelsList({
        storeId: fromStoreId,
        search: variant.sku,
        limit: 20,
      }),
    );
    const level = (res.data?.data ?? []).find(
      (l) => l.variantId === variant.id,
    );
    const available = level?.quantity ?? 0;
    if (available <= 0) {
      return `${product.name} — ${variant.name} is not in stock at the source store`;
    }
    handleVariantSelect({
      variantId: variant.id,
      label: `${product.name} — ${variant.name}`,
      sku: variant.sku,
      available,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-[var(--text-primary)]">Line Items</h2>

      {/* Variant search */}
      <div className="glass-panel p-4 space-y-3">
        <label className="text-sm font-semibold text-[var(--text-secondary)]">
          Search & Add Variants
        </label>
        {!fromStoreId ? (
          <p className="text-sm text-slate-400">
            Select a source store first to see which variants are available to transfer.
          </p>
        ) : (
          <>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search by product name or SKU…"
                value={variantSearch}
                onChange={(e) => setVariantSearch(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border-glass)] bg-white/90 pl-9 pr-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/12"
              />
            </div>
            <BarcodeScanInput
              placeholder="Scan barcode to add a variant…"
              onScan={handleVariantScan}
            />
            {variantSearch && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
                {results.filter((v) => !addedVariantIds.has(v.variantId)).length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-400">
                    No in-stock variants found at the source store
                  </p>
                ) : (
                  results
                    .filter((v) => !addedVariantIds.has(v.variantId))
                    .map((r) => {
                      const outOfStock = r.available <= 0;
                      return (
                        <button
                          key={r.variantId}
                          type="button"
                          disabled={outOfStock}
                          onClick={() => handleVariantSelect(r)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                            outOfStock ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-medium text-[var(--text-primary)]">{r.label}</span>
                          <span className="ml-3 flex items-center gap-3">
                            <span className="text-xs text-slate-400 font-mono">{r.sku}</span>
                            {outOfStock ? (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-500">
                                Out of stock
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-slate-500">
                                {r.available} in stock
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Items table */}
      {fields.length > 0 ? (
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Variant
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest w-32">
                  Quantity
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((field, index) => {
                const variantId = items?.[index]?.variantId ?? field.variantId;
                const available = availableOf(variantId);
                const overStock = Number(items?.[index]?.quantity ?? 0) > available;
                return (
                <tr key={field.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--text-primary)]">
                      {items?.[index]?.variantLabel ?? field.variantId}
                    </p>
                    <p className="text-xs text-slate-400">{available} in stock at source</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      min={1}
                      max={available}
                      className="w-24 rounded-xl border border-slate-200 px-3 py-1.5 text-center text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                      {...form.register(`items.${index}.quantity`)}
                    />
                    {form.formState.errors.items?.[index]?.quantity && (
                      <p className="text-xs text-red-500 mt-0.5">
                        {form.formState.errors.items[index]?.quantity?.message}
                      </p>
                    )}
                    {overStock && (
                      <p className="text-xs text-red-500 mt-0.5">
                        Exceeds {available} in stock
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 !p-0"
                      onClick={() => remove(index)}
                    >
                      <Trash2 size={13} className="text-slate-400 hover:text-rose-500" />
                    </Button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-panel flex flex-col items-center gap-2 py-10 text-center">
          <Plus size={22} className="text-slate-300" />
          <p className="text-sm text-slate-400">Search for a product above to add line items.</p>
        </div>
      )}

      {typeof form.formState.errors.items?.message === 'string' && (
        <p className="text-xs text-red-500">{form.formState.errors.items.message}</p>
      )}
    </div>
  );
}

const defaults: TransferFormData = {
  fromStoreId: '',
  toStoreId: '',
  notes: '',
  items: [],
};

export default function TransferForm() {
  const router = useRouter();
  const createTransfer = useCreateTransfer();
  const { data: stores } = useStoresQuery({ pageSize: 100 });

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: defaults,
  });

  // Non-admins can only originate transfers from their own store, so lock the
  // source selector to their assigned store. Admins keep free choice.
  const role = useAuthStore((state) => state.user?.role);
  const myStoreId = useAuthStore((state) => state.user?.storeId);
  const lockSource = role !== Role.ADMIN && !!myStoreId;

  useEffect(() => {
    if (lockSource && myStoreId) {
      form.setValue('fromStoreId', myStoreId, { shouldValidate: true });
    }
  }, [lockSource, myStoreId, form]);

  const fromStoreId = useWatch({ control: form.control, name: 'fromStoreId' });

  const sourceStore = (stores ?? []).find((s) => s.id === fromStoreId);

  const storeOptions = [
    { value: '', label: '— Select store —' },
    ...(stores ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
  ];

  // Destination must differ from the source, so drop the source store from the
  // destination options.
  const destinationOptions = storeOptions.filter(
    (o) => o.value === '' || o.value !== fromStoreId,
  );

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      fromStoreId: values.fromStoreId,
      toStoreId: values.toStoreId,
      ...(values.notes ? { notes: values.notes } : {}),
      items: values.items.map((item) => ({
        variantId: item.variantId,
        quantity: Number(item.quantity),
      })),
    };

    try {
      const transfer = await createTransfer.mutateAsync(payload);
      toast.success(`Transfer ${transfer.transferNumber} created`);
      router.push(`/transfers/${transfer.id}`);
    } catch {
      // error toast handled by hook
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Header fields */}
      <div className="glass-panel p-6 space-y-4">
        <h2 className="font-semibold text-[var(--text-primary)]">Transfer Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--text-secondary)]">
              Source Store <span className="text-red-500">*</span>
            </label>
            {lockSource ? (
              <div className="w-full rounded-2xl border border-[var(--border-glass)] bg-slate-50/80 px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                {sourceStore
                  ? `${sourceStore.name} (${sourceStore.code})`
                  : 'Your store'}
              </div>
            ) : (
              <select
                className="w-full appearance-none rounded-2xl border border-[var(--border-glass)] bg-white/90 px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/12"
                {...form.register('fromStoreId')}
              >
                {storeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
            {form.formState.errors.fromStoreId && (
              <p className="text-xs text-red-500">{form.formState.errors.fromStoreId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--text-secondary)]">
              Destination Store <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full appearance-none rounded-2xl border border-[var(--border-glass)] bg-white/90 px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/12"
              {...form.register('toStoreId')}
            >
              {destinationOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {form.formState.errors.toStoreId && (
              <p className="text-xs text-red-500">{form.formState.errors.toStoreId.message}</p>
            )}
          </div>
        </div>

        <FormField<TransferFormData>
          name="notes"
          control={form.control}
          label="Notes"
          placeholder="Optional notes for this transfer"
        />
      </div>

      {/* Line items */}
      <LineItemsSection form={form} fromStoreId={fromStoreId} />

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={createTransfer.isPending}>
          {createTransfer.isPending ? 'Creating…' : 'Create Transfer'}
        </Button>
      </div>
    </form>
  );
}
