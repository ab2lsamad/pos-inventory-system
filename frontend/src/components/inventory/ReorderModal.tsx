'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import FormField from '@/components/ui/FormField';
import { setReorderSchema, type SetReorderFormData } from '@/schemas/inventory';
import { useSetReorder } from '@/hooks/inventory/useSetReorder';
import type { InventoryLevel } from '@/types/inventory';

interface ReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: InventoryLevel | null;
}

export default function ReorderModal({
  isOpen,
  onClose,
  level,
}: ReorderModalProps) {
  const setReorder = useSetReorder();

  const form = useForm<SetReorderFormData>({
    resolver: zodResolver(setReorderSchema),
    defaultValues: { reorderPointStr: '', reorderQtyStr: '' },
  });

  useEffect(() => {
    if (!isOpen || !level) return;
    form.reset({
      reorderPointStr: String(level.reorderPoint ?? 0),
      reorderQtyStr:
        level.reorderQty != null && level.reorderQty > 0
          ? String(level.reorderQty)
          : '',
    });
  }, [isOpen, level, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!level) return;
    try {
      await setReorder.mutateAsync({
        storeId: level.storeId,
        variantId: level.variantId,
        reorderPoint: parseInt(values.reorderPointStr, 10),
        reorderQty:
          values.reorderQtyStr.trim() === ''
            ? undefined
            : parseInt(values.reorderQtyStr, 10),
      });
      toast.success('Reorder point updated');
      onClose();
    } catch {
      // error toast handled by hook
    }
  });

  const productName =
    level?.variant?.product?.name ?? level?.variant?.name ?? 'Item';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Reorder Point"
      formId="set-reorder-form"
      onCancel={onClose}
      isLoading={setReorder.isPending}
      confirmLabel="Save Threshold"
    >
      <form id="set-reorder-form" onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-[1rem] border border-[var(--border-glass)] bg-white/60 px-4 py-3">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {productName}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-[var(--text-muted)]">
            {level?.variant?.sku ?? '—'}
            {level?.store?.name ? ` · ${level.store.name}` : ''} · On hand:{' '}
            {level?.quantity ?? 0}
          </p>
        </div>

        <FormField<SetReorderFormData>
          name="reorderPointStr"
          control={form.control}
          label="Reorder Point (alert at or below)"
          placeholder="e.g. 10"
          inputMode="numeric"
        />
        <FormField<SetReorderFormData>
          name="reorderQtyStr"
          control={form.control}
          label="Reorder Quantity (optional)"
          placeholder="Suggested amount to restock"
          inputMode="numeric"
        />
      </form>
    </Modal>
  );
}
