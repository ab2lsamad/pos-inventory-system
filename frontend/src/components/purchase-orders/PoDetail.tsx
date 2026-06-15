'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  PackageCheck,
  Calendar,
  Store,
  Building2,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PoReceiveModal from './PoReceiveModal';
import { useSubmitPo } from '@/hooks/purchase-orders/useSubmitPo';
import { useCancelPo } from '@/hooks/purchase-orders/useCancelPo';
import { format, toNumber } from '@/lib/money';
import { PurchaseOrderStatus } from '@/types/shared';
import type { PurchaseOrder } from '@/types/purchase-order';

interface PoDetailProps {
  po: PurchaseOrder;
}

export default function PoDetail({ po }: PoDetailProps) {
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'submit' | 'cancel' | null>(null);
  const submitPo = useSubmitPo();
  const cancelPo = useCancelPo();

  const isDraft = po.status === PurchaseOrderStatus.DRAFT;
  const canReceive =
    po.status === PurchaseOrderStatus.ORDERED ||
    po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED;
  const canCancel =
    po.status !== PurchaseOrderStatus.RECEIVED &&
    po.status !== PurchaseOrderStatus.CANCELLED;
  const isTerminal =
    po.status === PurchaseOrderStatus.RECEIVED ||
    po.status === PurchaseOrderStatus.CANCELLED;

  const handleSubmit = async () => {
    try {
      await submitPo.mutateAsync(po.id);
      toast.success('Purchase order submitted');
      setConfirmAction(null);
    } catch {
      // error toast handled by hook
    }
  };

  const handleCancel = async () => {
    try {
      await cancelPo.mutateAsync(po.id);
      toast.success('Purchase order cancelled');
      setConfirmAction(null);
    } catch {
      // error toast handled by hook
    }
  };

  return (
    <div className="space-y-6">
      {!isTerminal && (
        <div className="flex justify-end gap-2">
          {isDraft && (
            <Button
              onClick={() => setConfirmAction('submit')}
              disabled={submitPo.isPending}
            >
              <CheckCircle size={16} />
              Submit Order
            </Button>
          )}
          {canReceive && (
            <Button onClick={() => setReceiveOpen(true)}>
              <PackageCheck size={16} />
              Receive Stock
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              onClick={() => setConfirmAction('cancel')}
              disabled={cancelPo.isPending}
              className="text-rose-500 hover:bg-rose-50"
            >
              <XCircle size={16} />
              Cancel PO
            </Button>
          )}
        </div>
      )}

      {/* Meta cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="glass-panel p-4 flex items-center gap-3">
          <Building2 size={18} className="text-slate-400" />
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Supplier</p>
            <p className="font-semibold text-sm text-[var(--text-primary)]">{po.supplier.name}</p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-3">
          <Store size={18} className="text-slate-400" />
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Store</p>
            <p className="font-semibold text-sm text-[var(--text-primary)]">
              {po.store.name} <span className="text-slate-400">({po.store.code})</span>
            </p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-3">
          <Calendar size={18} className="text-slate-400" />
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Expected</p>
            <p className="font-semibold text-sm text-[var(--text-primary)]">
              {po.expectedAt ? new Date(po.expectedAt).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-3">
          <User size={18} className="text-slate-400" />
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Created By</p>
            <p className="font-semibold text-sm text-[var(--text-primary)]">{po.createdBy.fullName}</p>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="glass-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-[var(--text-primary)]">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Variant
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  SKU
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Ordered
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Received
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Unit Cost
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {po.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-[var(--text-primary)]">
                      {item.variant?.product.name ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400">{item.variant?.name}</p>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">
                    {item.variant?.sku ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-center text-slate-600">{item.quantityOrdered}</td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={
                        item.quantityReceived >= item.quantityOrdered
                          ? 'text-emerald-600 font-semibold'
                          : item.quantityReceived > 0
                          ? 'text-amber-600 font-semibold'
                          : 'text-slate-400'
                      }
                    >
                      {item.quantityReceived}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">
                    {format(po.currency, item.unitCost)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-700">
                    {format(po.currency, item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="ml-auto max-w-xs space-y-2">
            {toNumber(po.shippingCost) > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>{format(po.currency, po.subtotal)}</span>
              </div>
            )}
            {toNumber(po.shippingCost) > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Shipping</span>
                <span>{format(po.currency, po.shippingCost)}</span>
              </div>
            )}
            {toNumber(po.taxTotal) > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tax</span>
                <span>{format(po.currency, po.taxTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[var(--text-primary)] border-t border-slate-100 pt-2">
              <span>Grand Total</span>
              <span>{format(po.currency, po.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {po.notes && (
        <div className="glass-panel px-5 py-4">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1">Notes</p>
          <p className="text-sm text-slate-600 whitespace-pre-line">{po.notes}</p>
        </div>
      )}

      {po.receivedAt && (
        <div className="glass-panel px-5 py-4 flex items-center gap-3 border-l-4 border-emerald-400">
          <CheckCircle size={18} className="text-emerald-500" />
          <p className="text-sm text-slate-600">
            Fully received on{' '}
            <span className="font-semibold">{new Date(po.receivedAt).toLocaleDateString()}</span>
          </p>
        </div>
      )}

      <PoReceiveModal
        isOpen={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        po={po}
      />

      <Modal
        isOpen={confirmAction === 'submit'}
        onClose={() => setConfirmAction(null)}
        title="Submit Purchase Order"
        maxWidth="max-w-md"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void handleSubmit()}
        confirmType="button"
        confirmLabel="Submit Order"
        isLoading={submitPo.isPending}
      >
        <p className="text-sm text-slate-600">
          Submit PO <span className="font-mono font-semibold">{po.poNumber}</span>? Its
          status will move to <span className="font-semibold">ORDERED</span>.
        </p>
      </Modal>

      <Modal
        isOpen={confirmAction === 'cancel'}
        onClose={() => setConfirmAction(null)}
        title="Cancel Purchase Order"
        maxWidth="max-w-md"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void handleCancel()}
        confirmType="button"
        confirmVariant="danger"
        confirmLabel="Cancel PO"
        cancelLabel="Keep PO"
        isLoading={cancelPo.isPending}
      >
        <p className="text-sm text-slate-600">
          Cancel PO <span className="font-mono font-semibold">{po.poNumber}</span>? This
          cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
