'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { receiveTransferSchema } from '@/schemas/transfer';
import type { ReceiveTransferFormData } from '@/schemas/transfer';
import { useReceiveTransfer } from '@/hooks/transfers/useReceiveTransfer';
import type { StockTransfer } from '@/types/transfer';

interface TransferReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: StockTransfer;
}

export default function TransferReceiveModal({
  isOpen,
  onClose,
  transfer,
}: TransferReceiveModalProps) {
  const receive = useReceiveTransfer();

  const form = useForm<ReceiveTransferFormData>({
    resolver: zodResolver(receiveTransferSchema),
    defaultValues: { items: [] },
  });

  const { fields } = useFieldArray({ control: form.control, name: 'items' });

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      items: transfer.items.map((item) => ({
        itemId: item.id,
        quantityReceived: '0',
      })),
    });
  }, [isOpen, transfer.items, form]);

  const onSubmit = form.handleSubmit(async (values) => {
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
      await receive.mutateAsync({ id: transfer.id, payload });
      toast.success('Stock received at destination');
      onClose();
    } catch {
      // error toast handled by hook
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Receive Transfer — ${transfer.transferNumber}`}
      maxWidth="max-w-2xl"
      formId="transfer-receive-form"
      onCancel={onClose}
      isLoading={receive.isPending}
      confirmLabel="Confirm Receipt"
    >
      <form id="transfer-receive-form" onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Enter quantities received at <span className="font-semibold">{transfer.toStore.name}</span>.
          Items with 0 will be skipped.
        </p>

        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-widest">
                  Variant
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-widest">
                  Shipped
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
                const item = transfer.items[index];
                if (!item) return null;
                const remaining = item.quantity - item.quantityReceived;
                const isComplete = remaining <= 0;

                return (
                  <tr key={field.id} className={isComplete ? 'bg-slate-50 opacity-60' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--text-primary)]">
                        {item.variant?.product.name ?? '—'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.variant?.name} · {item.variant?.sku}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{item.quantityReceived}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={remaining > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                        {remaining}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isComplete ? (
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
