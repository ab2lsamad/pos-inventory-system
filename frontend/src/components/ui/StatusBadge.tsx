'use client';

import React from 'react';
import Badge from './Badge';
import {
  OrderAdjustmentStatus,
  OrderStatus,
  PayoutStatus,
  PurchaseOrderStatus,
  StockMovementType,
  TransferStatus,
} from '@/types/shared';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

type StatusKind =
  | 'order'
  | 'orderAdjustment'
  | 'purchaseOrder'
  | 'transfer'
  | 'payout'
  | 'stockMovement';

interface StatusBadgeProps {
  kind: StatusKind;
  status: string;
  className?: string;
}

const ORDER_MAP: Record<string, BadgeVariant> = {
  [OrderStatus.PENDING]: 'warning',
  [OrderStatus.COMPLETED]: 'success',
  [OrderStatus.CANCELLED]: 'danger',
  [OrderStatus.REFUNDED]: 'danger',
  [OrderStatus.PARTIALLY_REFUNDED]: 'warning',
  [OrderStatus.ON_HOLD]: 'info',
};

const ORDER_ADJUSTMENT_MAP: Record<string, BadgeVariant> = {
  [OrderAdjustmentStatus.COMPLETED]: 'success',
  [OrderAdjustmentStatus.CANCELLED]: 'danger',
};

const PO_MAP: Record<string, BadgeVariant> = {
  [PurchaseOrderStatus.DRAFT]: 'default',
  [PurchaseOrderStatus.ORDERED]: 'info',
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'warning',
  [PurchaseOrderStatus.RECEIVED]: 'success',
  [PurchaseOrderStatus.CANCELLED]: 'danger',
};

const TRANSFER_MAP: Record<string, BadgeVariant> = {
  [TransferStatus.DRAFT]: 'default',
  [TransferStatus.IN_TRANSIT]: 'info',
  [TransferStatus.RECEIVED]: 'success',
  [TransferStatus.CANCELLED]: 'danger',
};

const PAYOUT_MAP: Record<string, BadgeVariant> = {
  [PayoutStatus.DRAFT]: 'default',
  [PayoutStatus.APPROVED]: 'info',
  [PayoutStatus.PAID]: 'success',
  [PayoutStatus.CANCELLED]: 'danger',
};

const STOCK_MOVEMENT_MAP: Record<string, BadgeVariant> = {
  [StockMovementType.PURCHASE]: 'success',
  [StockMovementType.SALE]: 'info',
  [StockMovementType.RETURN_IN]: 'success',
  [StockMovementType.RETURN_OUT]: 'warning',
  [StockMovementType.ADJUSTMENT]: 'warning',
  [StockMovementType.TRANSFER_IN]: 'info',
  [StockMovementType.TRANSFER_OUT]: 'default',
  [StockMovementType.COUNT]: 'default',
};

const MAPS: Record<StatusKind, Record<string, BadgeVariant>> = {
  order: ORDER_MAP,
  orderAdjustment: ORDER_ADJUSTMENT_MAP,
  purchaseOrder: PO_MAP,
  transfer: TRANSFER_MAP,
  payout: PAYOUT_MAP,
  stockMovement: STOCK_MOVEMENT_MAP,
};

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function StatusBadge({ kind, status, className }: StatusBadgeProps) {
  const variant = MAPS[kind][status] ?? 'default';
  return (
    <Badge variant={variant} className={className}>
      {humanize(status)}
    </Badge>
  );
}
