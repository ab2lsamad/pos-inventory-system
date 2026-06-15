'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Pencil, Package, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';
import BarcodeScanInput from '@/components/ui/BarcodeScanInput';
import { useSupplierProducts } from '@/hooks/suppliers/useSupplierProducts';
import { useAddSupplierProduct } from '@/hooks/suppliers/useAddSupplierProduct';
import { useUpdateSupplierProduct } from '@/hooks/suppliers/useUpdateSupplierProduct';
import { useRemoveSupplierProduct } from '@/hooks/suppliers/useRemoveSupplierProduct';
import { useProductsQuery } from '@/hooks/products/useProductsQuery';
import { supplierProductSchema } from '@/schemas/supplier';
import type { SupplierProductFormData } from '@/schemas/supplier';
import type { Supplier, SupplierProduct } from '@/types/supplier';
import type { Product } from '@/types/product';
import { format } from '@/lib/money';

interface SupplierProductsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

interface FlatVariant {
  variantId: string;
  label: string;
  sku: string;
  cost: string;
}

function flattenVariants(products: Product[]): FlatVariant[] {
  const result: FlatVariant[] = [];
  for (const product of products) {
    for (const variant of product.variants) {
      result.push({
        variantId: variant.id,
        label: `${product.name} — ${variant.name}`,
        sku: variant.sku,
        cost: variant.cost,
      });
    }
  }
  return result;
}

const productFormDefaults: SupplierProductFormData = {
  variantId: '',
  supplierSku: '',
  costPrice: '',
  leadTimeDays: '',
};

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string;
  existing: SupplierProduct | null;
  linkedVariantIds: string[];
}

function VariantLinkModal({
  isOpen,
  onClose,
  supplierId,
  existing,
  linkedVariantIds,
}: ProductFormModalProps) {
  const addProduct = useAddSupplierProduct(supplierId);
  const updateProduct = useUpdateSupplierProduct(supplierId);
  const isPending = addProduct.isPending || updateProduct.isPending;
  const [variantSearch, setVariantSearch] = useState('');
  // A variant pulled in via barcode scan won't be in the search-result list, so
  // remember its label/cost here to render the confirmation chip.
  const [scannedVariant, setScannedVariant] = useState<FlatVariant | null>(null);

  const { data: products } = useProductsQuery({
    page: 1,
    pageSize: 50,
    search: variantSearch || undefined,
  });
  const flatVariants = flattenVariants(products ?? []);

  const form = useForm<SupplierProductFormData>({
    resolver: zodResolver(supplierProductSchema),
    defaultValues: productFormDefaults,
  });

  // Reset the local search/scan UI when the panel transitions to open. Done
  // during render (not in an effect) to avoid cascading re-renders.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setVariantSearch('');
      setScannedVariant(null);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      existing
        ? {
            variantId: existing.variantId,
            supplierSku: existing.supplierSku ?? '',
            costPrice: String(existing.costPrice ?? ''),
            leadTimeDays:
              existing.leadTimeDays != null ? String(existing.leadTimeDays) : '',
          }
        : productFormDefaults,
    );
  }, [isOpen, existing, form]);

  const selectedVariantId = useWatch({ control: form.control, name: 'variantId' });
  const selectedVariantLabel = existing
    ? `${existing.variant?.product.name ?? ''} — ${existing.variant?.name ?? ''}`
    : flatVariants.find((v) => v.variantId === selectedVariantId)?.label ??
      (scannedVariant?.variantId === selectedVariantId
        ? scannedVariant.label
        : undefined);
  const selectedVariantLastCost = existing
    ? existing.variant?.cost
    : flatVariants.find((v) => v.variantId === selectedVariantId)?.cost ??
      (scannedVariant?.variantId === selectedVariantId
        ? scannedVariant.cost
        : undefined);

  const handleVariantPick = (flat: FlatVariant) => {
    form.setValue('variantId', flat.variantId, { shouldValidate: true });
    if (!form.getValues('costPrice')) {
      form.setValue('costPrice', flat.cost ?? '0');
    }
    setVariantSearch('');
  };

  const handleVariantScan: React.ComponentProps<
    typeof BarcodeScanInput
  >['onScan'] = ({ product, variant }) => {
    if (linkedVariantIds.includes(variant.id)) {
      return `${product.name} — ${variant.name} is already linked`;
    }
    const flat: FlatVariant = {
      variantId: variant.id,
      label: `${product.name} — ${variant.name}`,
      sku: variant.sku,
      cost: variant.cost,
    };
    setScannedVariant(flat);
    handleVariantPick(flat);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        variantId: values.variantId,
        costPrice: Number(values.costPrice),
        ...(values.supplierSku ? { supplierSku: values.supplierSku } : {}),
        ...(values.leadTimeDays && values.leadTimeDays !== ''
          ? { leadTimeDays: Number(values.leadTimeDays) }
          : {}),
      };

      if (existing) {
        await updateProduct.mutateAsync({ variantId: existing.variantId, payload });
        toast.success('Variant link updated');
      } else {
        await addProduct.mutateAsync(payload);
        toast.success('Variant linked to supplier');
      }
      onClose();
      form.reset(productFormDefaults);
    } catch {
      // error toast handled by hook
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existing ? 'Edit Variant Link' : 'Link Variant to Supplier'}
      formId="supplier-product-form"
      onCancel={onClose}
      isLoading={isPending}
      confirmLabel={existing ? 'Update' : 'Link Variant'}
    >
      <form id="supplier-product-form" onSubmit={onSubmit} className="space-y-4">
        {!existing && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--text-secondary)]">
              Variant
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
              placeholder="Scan barcode to select a variant…"
              successVerb="Selected"
              onScan={handleVariantScan}
            />
            {variantSearch && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
                {flatVariants.filter((v) => !linkedVariantIds.includes(v.variantId)).length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-400">No variants found</p>
                ) : (
                  flatVariants
                    .filter((v) => !linkedVariantIds.includes(v.variantId))
                    .map((flat) => (
                      <button
                        key={flat.variantId}
                        type="button"
                        onClick={() => handleVariantPick(flat)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 text-left transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--text-primary)]">{flat.label}</span>
                          <span className="text-xs text-slate-400 font-mono">{flat.sku}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          Last cost: {format('PKR', flat.cost ?? '0')}
                        </span>
                      </button>
                    ))
                )}
              </div>
            )}
            {selectedVariantId && selectedVariantLabel && (
              <div className="rounded-xl bg-indigo-50/60 px-4 py-3 text-sm">
                <p className="font-semibold text-[var(--text-primary)]">{selectedVariantLabel}</p>
                {selectedVariantLastCost != null && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Last purchase cost (WAC): {format('PKR', selectedVariantLastCost)}
                  </p>
                )}
              </div>
            )}
            {form.formState.errors.variantId && (
              <p className="text-xs font-medium text-[var(--danger)]">
                {form.formState.errors.variantId.message}
              </p>
            )}
          </div>
        )}
        {existing && (
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-[var(--text-primary)]">{selectedVariantLabel}</p>
            {existing.variant?.sku && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {existing.variant.sku}</p>
            )}
            {selectedVariantLastCost != null && (
              <p className="text-xs text-slate-500 mt-0.5">
                Last purchase cost (WAC): {format('PKR', selectedVariantLastCost)}
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField<SupplierProductFormData>
            name="costPrice"
            control={form.control}
            label="Cost Price"
            placeholder="0.00"
            type="number"
          />
          <FormField<SupplierProductFormData>
            name="leadTimeDays"
            control={form.control}
            label="Lead Time (days)"
            placeholder="e.g. 7"
            type="number"
          />
        </div>
        <FormField<SupplierProductFormData>
          name="supplierSku"
          control={form.control}
          label="Supplier SKU"
          placeholder="Supplier's own SKU (optional)"
        />
      </form>
    </Modal>
  );
}

export default function SupplierProductsPanel({
  isOpen,
  onClose,
  supplier,
}: SupplierProductsPanelProps) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<SupplierProduct | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<SupplierProduct | null>(null);

  const { data: supplierProducts, isLoading } = useSupplierProducts(supplier?.id ?? null);
  const removeProduct = useRemoveSupplierProduct(supplier?.id ?? '');

  const confirmRemove = async () => {
    if (!linkToDelete) return;
    try {
      await removeProduct.mutateAsync(linkToDelete.variantId);
      toast.success('Variant removed from supplier');
      setLinkToDelete(null);
    } catch {
      // error toast handled by hook
    }
  };

  const deleteLabel = linkToDelete?.variant
    ? `${linkToDelete.variant.product.name} — ${linkToDelete.variant.name}`
    : linkToDelete?.variantId ?? '';

  const openAdd = () => {
    setEditingLink(null);
    setLinkModalOpen(true);
  };

  const openEdit = (link: SupplierProduct) => {
    setEditingLink(link);
    setLinkModalOpen(true);
  };

  const linkedVariantIds = (supplierProducts ?? []).map((l) => l.variantId);

  if (!supplier) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${supplier.name} — Linked Variants`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Manage which variants this supplier provides, with cost and lead time per variant.
            </p>
            <Button size="sm" onClick={openAdd}>
              <Plus size={14} />
              Link Variant
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Loading…</div>
          ) : !supplierProducts || supplierProducts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Package size={22} />
              </div>
              <p className="text-sm text-slate-500">No variants linked yet.</p>
              <Button size="sm" onClick={openAdd}>
                <Plus size={14} />
                Link First Variant
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden">
              {supplierProducts.map((link) => (
                <div
                  key={link.variantId}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-400">
                      <Package size={14} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[var(--text-primary)]">
                        {link.variant
                          ? `${link.variant.product.name} — ${link.variant.name}`
                          : link.variantId}
                      </p>
                      <p className="text-xs text-slate-400">
                        {link.variant?.sku && <span className="mr-2">SKU: {link.variant.sku}</span>}
                        {link.supplierSku && <span className="mr-2">Supplier SKU: {link.supplierSku}</span>}
                        {link.leadTimeDays != null && <span className="mr-2">Lead: {link.leadTimeDays}d</span>}
                        {link.variant?.cost != null && (
                          <span>WAC: {format('PKR', link.variant.cost)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">
                      {format('PKR', link.costPrice)}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 !p-0"
                        onClick={() => openEdit(link)}
                      >
                        <Pencil size={13} className="text-slate-400 hover:text-indigo-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 !p-0"
                        onClick={() => setLinkToDelete(link)}
                        disabled={removeProduct.isPending}
                      >
                        <Trash2 size={13} className="text-slate-400 hover:text-rose-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {supplier && (
        <VariantLinkModal
          isOpen={linkModalOpen}
          onClose={() => setLinkModalOpen(false)}
          supplierId={supplier.id}
          existing={editingLink}
          linkedVariantIds={linkedVariantIds}
        />
      )}

      <Modal
        isOpen={!!linkToDelete}
        onClose={() => setLinkToDelete(null)}
        title="Remove Linked Variant"
        maxWidth="max-w-md"
        onCancel={() => setLinkToDelete(null)}
        onConfirm={confirmRemove}
        confirmType="button"
        confirmVariant="danger"
        confirmLabel="Remove"
        isLoading={removeProduct.isPending}
      >
        <p className="text-sm text-slate-600">
          Remove <span className="font-semibold text-[var(--text-primary)]">{deleteLabel}</span> from
          this supplier? This won&apos;t affect any existing purchase orders.
        </p>
      </Modal>
    </>
  );
}
