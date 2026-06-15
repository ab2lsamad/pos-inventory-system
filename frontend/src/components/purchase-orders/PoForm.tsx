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
import { purchaseOrderSchema } from '@/schemas/purchase-order';
import type { PurchaseOrderFormData } from '@/schemas/purchase-order';
import { useCreatePo } from '@/hooks/purchase-orders/useCreatePo';
import { useSuppliersQuery } from '@/hooks/suppliers/useSuppliersQuery';
import { useSupplierProducts } from '@/hooks/suppliers/useSupplierProducts';
import { useStoresQuery } from '@/hooks/stores/useStoresQuery';
import { useProductsQuery } from '@/hooks/products/useProductsQuery';
import { useAuthStore } from '@/store/auth-store';
import { Role } from '@/types/shared';
import { format, toNumber } from '@/lib/money';
import type { Product } from '@/types/product';

interface FlatVariant {
  variantId: string;
  label: string;
  sku: string;
  defaultCost: string;
}

function flattenVariants(products: Product[]): FlatVariant[] {
  const result: FlatVariant[] = [];
  for (const product of products) {
    for (const variant of product.variants) {
      result.push({
        variantId: variant.id,
        label: `${product.name} — ${variant.name}`,
        sku: variant.sku,
        defaultCost: variant.cost,
      });
    }
  }
  return result;
}

function LineItemsSection({
  form,
  currency,
  supplierId,
}: {
  form: ReturnType<typeof useForm<PurchaseOrderFormData>>;
  currency: string;
  supplierId: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const [variantSearch, setVariantSearch] = useState('');
  const { data: products } = useProductsQuery({
    page: 1,
    pageSize: 50,
    search: variantSearch || undefined,
  });
  const flatVariants = flattenVariants(products ?? []);

  const { data: supplierVariants } = useSupplierProducts(supplierId || null);
  const supplierCostMap = new Map<string, string>(
    (supplierVariants ?? []).map((sv) => [sv.variantId, String(sv.costPrice)]),
  );

  const items = useWatch({ control: form.control, name: 'items' });

  const addedVariantIds = new Set((items ?? []).map((i) => i.variantId).filter(Boolean));

  const addVariant = (flat: FlatVariant) => {
    const supplierCost = supplierCostMap.get(flat.variantId);
    append({
      variantId: flat.variantId,
      variantLabel: flat.label,
      quantityOrdered: '1',
      unitCost: supplierCost ?? flat.defaultCost ?? '0',
    });
  };

  const handleVariantSelect = (flat: FlatVariant) => {
    addVariant(flat);
    setVariantSearch('');
  };

  const handleVariantScan: React.ComponentProps<
    typeof BarcodeScanInput
  >['onScan'] = ({ product, variant }) => {
    if (addedVariantIds.has(variant.id)) {
      return `${product.name} — ${variant.name} is already on this order`;
    }
    addVariant({
      variantId: variant.id,
      label: `${product.name} — ${variant.name}`,
      sku: variant.sku,
      defaultCost: variant.cost,
    });
  };

  const lineTotal = (index: number): string => {
    const item = items?.[index];
    if (!item) return '0.00';
    const qty = Number(item.quantityOrdered) || 0;
    const cost = toNumber(item.unitCost);
    return (qty * cost).toFixed(2);
  };

  const grandTotal = (): string => {
    const itemTotal = (items ?? []).reduce((sum, item) => {
      return sum + (Number(item.quantityOrdered) || 0) * toNumber(item.unitCost);
    }, 0);
    return itemTotal.toFixed(2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[var(--text-primary)]">Line Items</h2>
      </div>

      {/* Variant search & add */}
      <div className="glass-panel p-4 space-y-3">
        <label className="text-sm font-semibold text-[var(--text-secondary)]">
          Search & Add Variants
        </label>
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
          products={products ?? []}
          onScan={handleVariantScan}
        />
        {variantSearch && (
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
            {flatVariants.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400">No variants found</p>
            ) : (
              flatVariants
                .filter((v) => !addedVariantIds.has(v.variantId))
                .map((flat) => {
                  const supplierCost = supplierCostMap.get(flat.variantId);
                  return (
                    <button
                      key={flat.variantId}
                      type="button"
                      onClick={() => handleVariantSelect(flat)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 text-left transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-[var(--text-primary)]">{flat.label}</span>
                        <span className="text-xs text-slate-400 font-mono">{flat.sku}</span>
                      </div>
                      <div className="text-right text-xs ml-3">
                        {supplierCost != null ? (
                          <span className="font-semibold text-indigo-600">
                            Supplier: {format(currency, supplierCost)}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Last cost: {format(currency, flat.defaultCost ?? '0')}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
            )}
          </div>
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
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest w-28">
                  Qty
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest w-32">
                  Unit Cost
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-widest w-32">
                  Line Total
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((field, index) => (
                <tr key={field.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--text-primary)]">
                      {items?.[index]?.variantLabel ?? field.variantId}
                    </p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      min={1}
                      className="w-20 rounded-xl border border-slate-200 px-3 py-1.5 text-center text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                      {...form.register(`items.${index}.quantityOrdered`)}
                    />
                    {form.formState.errors.items?.[index]?.quantityOrdered && (
                      <p className="text-xs text-red-500 mt-0.5">
                        {form.formState.errors.items[index]?.quantityOrdered?.message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28 rounded-xl border border-slate-200 px-3 py-1.5 text-center text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                      {...form.register(`items.${index}.unitCost`)}
                    />
                    {form.formState.errors.items?.[index]?.unitCost && (
                      <p className="text-xs text-red-500 mt-0.5">
                        {form.formState.errors.items[index]?.unitCost?.message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">
                    {format(currency, lineTotal(index))}
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
              ))}
            </tbody>
            <tfoot className="border-t border-slate-100 bg-slate-50/60">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                  Items Total
                </td>
                <td className="px-4 py-3 text-right font-bold text-[var(--text-primary)]">
                  {format(currency, grandTotal())}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="glass-panel flex flex-col items-center gap-2 py-10 text-center">
          <Plus size={22} className="text-slate-300" />
          <p className="text-sm text-slate-400">Search for a product above to add line items.</p>
        </div>
      )}

      {form.formState.errors.items?.root && (
        <p className="text-xs text-red-500">{form.formState.errors.items.root.message}</p>
      )}
      {typeof form.formState.errors.items?.message === 'string' && (
        <p className="text-xs text-red-500">{form.formState.errors.items.message}</p>
      )}
    </div>
  );
}

const defaults: PurchaseOrderFormData = {
  supplierId: '',
  storeId: '',
  expectedAt: '',
  shippingCost: '',
  taxTotal: '',
  notes: '',
  items: [],
};

export default function PoForm() {
  const router = useRouter();
  const createPo = useCreatePo();
  const { data: suppliers } = useSuppliersQuery({ pageSize: 100 });
  const { data: stores } = useStoresQuery({ pageSize: 100 });

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: defaults,
  });

  // Non-admins can only raise POs for their own store, so lock the selector to
  // their assigned store. Admins keep free choice across all stores.
  const role = useAuthStore((state) => state.user?.role);
  const myStoreId = useAuthStore((state) => state.user?.storeId);
  const lockStore = role !== Role.ADMIN && !!myStoreId;

  useEffect(() => {
    if (lockStore && myStoreId) {
      form.setValue('storeId', myStoreId, { shouldValidate: true });
    }
  }, [lockStore, myStoreId, form]);

  const storeId = useWatch({ control: form.control, name: 'storeId' });
  const supplierId = useWatch({ control: form.control, name: 'supplierId' });
  const selectedStore = stores?.find((s) => s.id === storeId);
  const currency = selectedStore?.currency ?? 'PKR';

  const supplierOptions = [
    { value: '', label: '— Select supplier —' },
    ...(suppliers ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];

  const storeOptions = [
    { value: '', label: '— Select store —' },
    ...(stores ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
  ];

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      supplierId: values.supplierId,
      storeId: values.storeId,
      ...(values.expectedAt ? { expectedAt: values.expectedAt } : {}),
      ...(values.shippingCost ? { shippingCost: Number(values.shippingCost) } : {}),
      ...(values.taxTotal ? { taxTotal: Number(values.taxTotal) } : {}),
      ...(values.notes ? { notes: values.notes } : {}),
      items: values.items.map((item) => ({
        variantId: item.variantId,
        quantityOrdered: Number(item.quantityOrdered),
        unitCost: Number(item.unitCost),
      })),
    };

    try {
      const po = await createPo.mutateAsync(payload);
      toast.success(`Purchase order ${po.poNumber} created`);
      router.push(`/purchase-orders/${po.id}`);
    } catch {
      // error toast handled by hook
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Header fields */}
      <div className="glass-panel p-6 space-y-4">
        <h2 className="font-semibold text-[var(--text-primary)]">Order Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--text-secondary)]">
              Supplier <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full appearance-none rounded-2xl border border-[var(--border-glass)] bg-white/90 px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/12"
              {...form.register('supplierId')}
            >
              {supplierOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {form.formState.errors.supplierId && (
              <p className="text-xs text-red-500">{form.formState.errors.supplierId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--text-secondary)]">
              Destination Store <span className="text-red-500">*</span>
            </label>
            {lockStore ? (
              <div className="w-full rounded-2xl border border-[var(--border-glass)] bg-slate-50/80 px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                {selectedStore
                  ? `${selectedStore.name} (${selectedStore.code})`
                  : 'Your store'}
              </div>
            ) : (
              <select
                className="w-full appearance-none rounded-2xl border border-[var(--border-glass)] bg-white/90 px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/12"
                {...form.register('storeId')}
              >
                {storeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
            {form.formState.errors.storeId && (
              <p className="text-xs text-red-500">{form.formState.errors.storeId.message}</p>
            )}
          </div>

          <FormField<PurchaseOrderFormData>
            name="expectedAt"
            control={form.control}
            label="Expected Delivery Date"
            type="date"
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField<PurchaseOrderFormData>
              name="shippingCost"
              control={form.control}
              label="Shipping Cost"
              placeholder="0"
              type="number"
            />
            <FormField<PurchaseOrderFormData>
              name="taxTotal"
              control={form.control}
              label="Tax Total"
              placeholder="0"
              type="number"
            />
          </div>
        </div>

        <FormField<PurchaseOrderFormData>
          name="notes"
          control={form.control}
          label="Notes"
          placeholder="Optional notes for this purchase order"
        />
      </div>

      {/* Line items */}
      <LineItemsSection form={form} currency={currency} supplierId={supplierId} />

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={createPo.isPending}>
          {createPo.isPending ? 'Creating…' : 'Create Purchase Order'}
        </Button>
      </div>
    </form>
  );
}
