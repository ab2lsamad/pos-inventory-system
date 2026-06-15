'use client';

import { useState } from 'react';
import {
  Truck,
  XCircle,
  PackageCheck,
  Calendar,
  Store,
  User,
  CheckCircle,
  ArrowRightLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TransferReceiveModal from './TransferReceiveModal';
import { useShipTransfer } from '@/hooks/transfers/useShipTransfer';
import { useCancelTransfer } from '@/hooks/transfers/useCancelTransfer';
import { useAuthStore } from '@/store/auth-store';
import { Role, TransferStatus } from '@/types/shared';
import type { StockTransfer } from '@/types/transfer';

interface TransferDetailProps {
  transfer: StockTransfer;
}

export default function TransferDetail({ transfer }: TransferDetailProps) {
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const ship = useShipTransfer();
  const cancel = useCancelTransfer();

  const role = useAuthStore((state) => state.user?.role);
  const myStoreId = useAuthStore((state) => state.user?.storeId);
  const isAdmin = role === Role.ADMIN;
  // Non-admins may only act on the side their store owns: ship/cancel from the
  // source store, receive into the destination store.
  const ownsSource = isAdmin || transfer.fromStore.id === myStoreId;
  const ownsDestination = isAdmin || transfer.toStore.id === myStoreId;

  const isDraft = transfer.status === TransferStatus.DRAFT;
  const isInTransit = transfer.status === TransferStatus.IN_TRANSIT;
  const isTerminal =
    transfer.status === TransferStatus.RECEIVED ||
    transfer.status === TransferStatus.CANCELLED;

  const canShip = isDraft && ownsSource;
  const canCancel = isDraft && ownsSource;
  const canReceive = isInTransit && ownsDestination;
  const showActions = !isTerminal && (canShip || canReceive || canCancel);

  const handleShip = async () => {
    try {
      await ship.mutateAsync(transfer.id);
      toast.success('Transfer shipped — stock deducted from source');
      setShipOpen(false);
    } catch {
      // error toast handled by hook
    }
  };

  const handleCancel = async () => {
    try {
      await cancel.mutateAsync(transfer.id);
      toast.success('Transfer cancelled');
      setCancelOpen(false);
    } catch {
      // error toast handled by hook
    }
  };

  return (
    <div className="space-y-6">
      {showActions && (
        <div className="flex justify-end gap-2">
          {canShip && (
            <Button onClick={() => setShipOpen(true)} disabled={ship.isPending}>
              <Truck size={16} />
              Ship Transfer
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
              onClick={() => setCancelOpen(true)}
              disabled={cancel.isPending}
              className="text-rose-500 hover:bg-rose-50"
            >
              <XCircle size={16} />
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Meta cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="glass-panel p-4 flex items-center gap-3">
          <Store size={18} className="text-slate-400" />
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">From</p>
            <p className="font-semibold text-sm text-[var(--text-primary)]">
              {transfer.fromStore.name}{' '}
              <span className="text-slate-400">({transfer.fromStore.code})</span>
            </p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-3">
          <ArrowRightLeft size={18} className="text-slate-400" />
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">To</p>
            <p className="font-semibold text-sm text-[var(--text-primary)]">
              {transfer.toStore.name}{' '}
              <span className="text-slate-400">({transfer.toStore.code})</span>
            </p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-3">
          <Calendar size={18} className="text-slate-400" />
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
              Shipped
            </p>
            <p className="font-semibold text-sm text-[var(--text-primary)]">
              {transfer.shippedAt
                ? new Date(transfer.shippedAt).toLocaleDateString()
                : '—'}
            </p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-3">
          <User size={18} className="text-slate-400" />
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
              Created By
            </p>
            <p className="font-semibold text-sm text-[var(--text-primary)]">
              {transfer.createdBy.fullName}
            </p>
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
                  Qty Shipped
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Qty Received
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Remaining
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfer.items.map((item) => {
                const remaining = item.quantity - item.quantityReceived;
                return (
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
                    <td className="px-5 py-3 text-center text-slate-600">{item.quantity}</td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={
                          item.quantityReceived >= item.quantity
                            ? 'text-emerald-600 font-semibold'
                            : item.quantityReceived > 0
                            ? 'text-amber-600 font-semibold'
                            : 'text-slate-400'
                        }
                      >
                        {item.quantityReceived}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={
                          remaining === 0
                            ? 'text-emerald-600 font-semibold'
                            : 'text-amber-600 font-semibold'
                        }
                      >
                        {remaining}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {transfer.notes && (
        <div className="glass-panel px-5 py-4">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1">
            Notes
          </p>
          <p className="text-sm text-slate-600 whitespace-pre-line">{transfer.notes}</p>
        </div>
      )}

      {transfer.receivedAt && (
        <div className="glass-panel px-5 py-4 flex items-center gap-3 border-l-4 border-emerald-400">
          <CheckCircle size={18} className="text-emerald-500" />
          <p className="text-sm text-slate-600">
            Fully received on{' '}
            <span className="font-semibold">
              {new Date(transfer.receivedAt).toLocaleDateString()}
            </span>
          </p>
        </div>
      )}

      <TransferReceiveModal
        isOpen={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        transfer={transfer}
      />

      <ConfirmDialog
        isOpen={shipOpen}
        onClose={() => setShipOpen(false)}
        onConfirm={() => void handleShip()}
        title="Ship Transfer"
        message={`Ship ${transfer.transferNumber}? Stock will be deducted from ${transfer.fromStore.name} immediately.`}
        confirmLabel="Ship Transfer"
        isLoading={ship.isPending}
      />

      <ConfirmDialog
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => void handleCancel()}
        title="Cancel Transfer"
        message={`Cancel ${transfer.transferNumber}? This cannot be undone.`}
        confirmLabel="Cancel Transfer"
        cancelLabel="Keep Transfer"
        confirmVariant="danger"
        isLoading={cancel.isPending}
      />
    </div>
  );
}
