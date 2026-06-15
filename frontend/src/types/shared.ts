export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  ON_HOLD = 'ON_HOLD',
}

export enum PaymentMethod {
  CASH = 'CASH',
  DEBIT_CARD = 'DEBIT_CARD',
  MOBILE_WALLET = 'MOBILE_WALLET',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OTHER = 'OTHER',
}

export enum ProductType {
  SIMPLE = 'SIMPLE',
  VARIABLE = 'VARIABLE',
}

export enum StockMovementType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  RETURN_IN = 'RETURN_IN',
  RETURN_OUT = 'RETURN_OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  COUNT = 'COUNT',
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  ORDERED = 'ORDERED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum TransferStatus {
  DRAFT = 'DRAFT',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum DiscountScope {
  ORDER = 'ORDER',
  LINE_ITEM = 'LINE_ITEM',
}

export enum PayoutStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum OrderAdjustmentType {
  RETURN = 'RETURN',
  EXCHANGE = 'EXCHANGE',
  SALE_ADJUSTMENT = 'SALE_ADJUSTMENT',
}

export enum OrderAdjustmentStatus {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: Role;
    storeId?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
