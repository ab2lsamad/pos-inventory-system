'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { receivePoSchema } from '@/schemas/purchase-order';
import type { ReceivePoFormData } from '@/schemas/purchase-order';
import { useReceivePo } from '@/hooks/purchase-orders/useReceivePo';
import type { PurchaseOrder } from '@/types/purchase-order';

interface PoReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder;
}

export default function PoReceiveModal({ isOpen, onClose, po }: PoReceiveModalProps) {
  const receive = useReceivePo();

  const form = useForm<ReceivePoFormData>({
    resolver: zodResolver(receivePoSchema),
    defaultValues: { items: [] },
  });

  const { fields } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = useWatch({ control: form.control, name: 'items' });

  const hasOverage = (watchedItems ?? []).some((entry) => {
    const line = po.items.find((l) => l.id === entry?.itemId);
    if (!line) return false;
    const remaining = line.quantityOrdered - line.quantityReceived;
    return Number(entry?.quantityReceived) > remaining;
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      items: po.items.map((item) => ({
        itemId: item.id,
        quantityReceived: '0',
      })),
    });
  }, [isOpen, po.items, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const overReceived = values.items.find((entry, idx) => {
      const line = po.items.find((l) => l.id === entry.itemId);
      if (!line) return false;
      const remaining = line.quantityOrdered - line.quantityReceived;
      return Number(entry.quantityReceived) > remaining && idx >= 0;
    });
    if (overReceived) {
      toast.error('One or more lines exceed the remaining quantity');
      return;
    }

    const payload = {
      items: values.items
        .filter((i) => Number(i.quantityReceived) > 0)
        .map((i) => ({
          itemId: i.itemId,
          quantityReceived: Number(i.quantityReceived),
        })),
    };

    if (payload.items.length === 0) {
      toast.error('Enter at least one quantity > 0');
      return;
    }

    try {
      await receive.mutateAsync({ id: po.id, payload });
      toast.success('Stock received');
      onClose();
    } catch {
      // error toast handled by hook
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Receive Stock — ${po.poNumber}`}
      maxWidth="max-w-2xl"
      formId="po-receive-form"
      onCancel={onClose}
      isLoading={receive.isPending}
      confirmLabel="Confirm Receipt"
      disabled={hasOverage}
    >
      <form id="po-receive-form" onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Enter quantities received for each line. Items with 0 will be skipped.
        </p>

        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-widest">
                  Variant
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-widest">
                  Ordered
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-widest">
                  Received
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-widest">
                  Remaining
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-widest">
                  Receiving Now
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((field, index) => {
                const item = po.items[index];
                if (!item) return null;
                const remaining = item.quantityOrdered - item.quantityReceived;
                const isFullyReceived = remaining <= 0;

                return (
                  <tr key={field.id} className={isFullyReceived ? 'bg-slate-50 opacity-60' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--text-primary)]">
                        {item.variant?.product.name ?? '—'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.variant?.name} · {item.variant?.sku}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {item.quantityOrdered}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {item.quantityReceived}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={remaining > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}
                      >
                        {remaining}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isFullyReceived ? (
                        <span className="text-xs text-slate-400">Complete</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          className="w-20 rounded-xl border border-slate-200 px-3 py-1.5 text-center text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                          {...form.register(`items.${index}.quantityReceived`)}
                        />
                      )}
                      {form.formState.errors.items?.[index]?.quantityReceived && (
                        <p className="text-xs text-red-500 mt-1">
                          {form.formState.errors.items[index]?.quantityReceived?.message}
                        </p>
                      )}
                      {!isFullyReceived &&
                        Number(watchedItems?.[index]?.quantityReceived) > remaining && (
                          <p className="text-xs text-red-500 mt-1">
                            Cannot exceed remaining ({remaining})
                          </p>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </form>
    </Modal>
  );
}
