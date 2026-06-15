'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import FormField from '@/components/ui/FormField';
import SearchableSelect, {
  type SearchableSelectItem,
} from '@/components/ui/SearchableSelect';
import BarcodeScanInput from '@/components/ui/BarcodeScanInput';
import { recordCountSchema, type RecordCountFormData } from '@/schemas/inventory';
import { useRecordCount } from '@/hooks/inventory/useRecordCount';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { PaginatedResponse } from '@/types/shared';
import type { Product } from '@/types/product';
import type { Store } from '@/types/store';

interface StockCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStoreId?: string;
}

const defaults: RecordCountFormData = {
  storeId: '',
  variantId: '',
  countedQuantityStr: '',
};

export default function StockCountModal({
  isOpen,
  onClose,
  defaultStoreId,
}: StockCountModalProps) {
  const recordCount = useRecordCount();
  const [selectedVariantItem, setSelectedVariantItem] =
    useState<SearchableSelectItem | null>(null);

  const form = useForm<RecordCountFormData>({
    resolver: zodResolver(recordCountSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset({ storeId: defaultStoreId ?? '', variantId: '', countedQuantityStr: '' });
  }, [isOpen, defaultStoreId, form]);

  const fetchStores = useCallback(
    async (search: string): Promise<SearchableSelectItem[]> => {
      const res = await api.get<PaginatedResponse<Store>>(
        API_ENDPOINTS.stores.list(1, 50, search ? { search } : undefined),
      );
      return (res.data?.data ?? []).map((s) => ({
        value: s.id,
        label: s.name,
        sublabel: s.code ?? undefined,
      }));
    },
    [],
  );

  // One variant field instead of a product → variant drill-down: search the
  // products API and flatten each product's active variants into pickable rows.
  const fetchVariants = useCallback(
    async (search: string): Promise<SearchableSelectItem[]> => {
      const res = await api.get<PaginatedResponse<Product>>(
        API_ENDPOINTS.products.list(1, 50, search ? { search } : undefined),
      );
      const items = res.data?.data ?? [];
      return items.flatMap((p) =>
        p.variants
          .filter((v) => v.isActive)
          .map((v) => ({
            value: v.id,
            label: `${p.name} — ${v.name || v.sku}`,
            sublabel: v.sku,
          })),
      );
    },
    [],
  );

  const storeSelectedItem = useMemo<SearchableSelectItem | null>(() => null, []);

  const handleVariantScan: React.ComponentProps<
    typeof BarcodeScanInput
  >['onScan'] = ({ product, variant }) => {
    form.setValue('variantId', variant.id, { shouldValidate: true });
    setSelectedVariantItem({
      value: variant.id,
      label: `${product.name} — ${variant.name || variant.sku}`,
      sublabel: variant.sku,
    });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await recordCount.mutateAsync({
        storeId: values.storeId,
        variantId: values.variantId,
        countedQuantity: parseInt(values.countedQuantityStr, 10),
      });
      toast.success('Stock count recorded');
      onClose();
    } catch {
      // error toast handled by hook
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Stock Count"
      formId="stock-count-form"
      onCancel={onClose}
      isLoading={recordCount.isPending}
      confirmLabel="Record Count"
    >
      <form id="stock-count-form" onSubmit={onSubmit} className="space-y-4">
        <Controller
          control={form.control}
          name="storeId"
          render={({ field, fieldState }) => (
            <SearchableSelect
              label="Store"
              value={field.value || null}
              onChange={(val) => field.onChange(val ?? '')}
              fetchItems={fetchStores}
              selectedItem={storeSelectedItem}
              placeholder="Search stores…"
              error={fieldState.error?.message}
              allowClear={false}
            />
          )}
        />

        <Controller
          control={form.control}
          name="variantId"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-2">
              <SearchableSelect
                label="Variant"
                value={field.value || null}
                onChange={(val) => {
                  field.onChange(val ?? '');
                  if (!val) setSelectedVariantItem(null);
                }}
                fetchItems={fetchVariants}
                selectedItem={selectedVariantItem}
                placeholder="Search products / variants…"
                error={fieldState.error?.message}
                allowClear={false}
              />
              <BarcodeScanInput
                placeholder="Scan barcode to select a variant…"
                successVerb="Selected"
                onScan={handleVariantScan}
              />
            </div>
          )}
        />

        <FormField<RecordCountFormData>
          name="countedQuantityStr"
          control={form.control}
          label="Counted Quantity"
          placeholder="Enter the physically counted quantity"
        />
      </form>
    </Modal>
  );
}
