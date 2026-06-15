import {
  OrderAdjustmentStatus,
  OrderAdjustmentType,
  OrderStatus,
  PaymentMethod,
  PurchaseOrderStatus,
  TransferStatus,
  PayoutStatus,
  StockMovementType,
  Role,
} from '@/types/shared';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export function getOrderStatusVariant(status: OrderStatus | string): BadgeVariant {
  switch (status) {
    case OrderStatus.COMPLETED:
      return 'success';
    case OrderStatus.PENDING:
      return 'warning';
    case OrderStatus.ON_HOLD:
      return 'warning';
    case OrderStatus.CANCELLED:
      return 'danger';
    case OrderStatus.REFUNDED:
      return 'danger';
    case OrderStatus.PARTIALLY_REFUNDED:
      return 'info';
    default:
      return 'default';
  }
}

export function getPaymentMethodVariant(method: PaymentMethod | string): BadgeVariant {
  switch (method) {
    case PaymentMethod.CASH:
      return 'info';
    case PaymentMethod.DEBIT_CARD:
      return 'success';
    case PaymentMethod.MOBILE_WALLET:
      return 'warning';
    case PaymentMethod.BANK_TRANSFER:
      return 'default';
    default:
      return 'default';
  }
}

export function getRoleVariant(role: Role | string): BadgeVariant {
  switch (role) {
    case Role.ADMIN:
      return 'danger';
    case Role.MANAGER:
      return 'warning';
    case Role.CASHIER:
      return 'info';
    case Role.EMPLOYEE:
      return 'success';
    default:
      return 'default';
  }
}

export function getAdjustmentStatusVariant(
  status: OrderAdjustmentStatus | string,
): BadgeVariant {
  switch (status) {
    case OrderAdjustmentStatus.COMPLETED:
      return 'success';
    case OrderAdjustmentStatus.CANCELLED:
      return 'danger';
    default:
      return 'default';
  }
}

export function getAdjustmentTypeVariant(
  type: OrderAdjustmentType | string,
): BadgeVariant {
  switch (type) {
    case OrderAdjustmentType.RETURN:
      return 'danger';
    case OrderAdjustmentType.EXCHANGE:
      return 'warning';
    default:
      return 'info';
  }
}

export function getPurchaseOrderStatusVariant(
  status: PurchaseOrderStatus | string,
): BadgeVariant {
  switch (status) {
    case PurchaseOrderStatus.RECEIVED:
      return 'success';
    case PurchaseOrderStatus.ORDERED:
      return 'info';
    case PurchaseOrderStatus.PARTIALLY_RECEIVED:
      return 'warning';
    case PurchaseOrderStatus.DRAFT:
      return 'default';
    case PurchaseOrderStatus.CANCELLED:
      return 'danger';
    default:
      return 'default';
  }
}

export function getTransferStatusVariant(
  status: TransferStatus | string,
): BadgeVariant {
  switch (status) {
    case TransferStatus.RECEIVED:
      return 'success';
    case TransferStatus.IN_TRANSIT:
      return 'info';
    case TransferStatus.DRAFT:
      return 'default';
    case TransferStatus.CANCELLED:
      return 'danger';
    default:
      return 'default';
  }
}

export function getPayoutStatusVariant(
  status: PayoutStatus | string,
): BadgeVariant {
  switch (status) {
    case PayoutStatus.PAID:
      return 'success';
    case PayoutStatus.APPROVED:
      return 'info';
    case PayoutStatus.DRAFT:
      return 'warning';
    case PayoutStatus.CANCELLED:
      return 'danger';
    default:
      return 'default';
  }
}

export function getStockMovementTypeVariant(
  type: StockMovementType | string,
): BadgeVariant {
  switch (type) {
    case StockMovementType.SALE:
    case StockMovementType.RETURN_OUT:
    case StockMovementType.TRANSFER_OUT:
      return 'danger';
    case StockMovementType.PURCHASE:
    case StockMovementType.RETURN_IN:
    case StockMovementType.TRANSFER_IN:
      return 'success';
    case StockMovementType.ADJUSTMENT:
    case StockMovementType.COUNT:
      return 'info';
    default:
      return 'default';
  }
}
