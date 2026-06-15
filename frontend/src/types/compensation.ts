import type { Store } from './store';
import type { User } from './user';
import {
  OrderAdjustmentStatus,
  OrderAdjustmentType,
  OrderStatus,
  PaymentMethod,
  PayoutStatus,
  Role,
} from './shared';

export interface CompensationSummaryItem {
  userId: string;
  employee: User;
  role: Role;
  store?: Store;
  baseSalary: number;
  commissionPercent: number;
  orderCount: number;
  grossSales: number;
  refunds: number;
  additionalCharges: number;
  netCommissionableSales: number;
  commissionAmount: number;
  totalPayableAmount: number;
}

export interface CompensationSummaryTotals {
  employees: number;
  orderCount: number;
  grossSales: number;
  refunds: number;
  additionalCharges: number;
  netCommissionableSales: number;
  commissionAmount: number;
  baseSalaryAmount: number;
  totalPayableAmount: number;
}

export interface CompensationSummaryResponse {
  periodStart: string;
  periodEnd: string;
  data: CompensationSummaryItem[];
  totals: CompensationSummaryTotals;
}

export interface CompensationOrderEntry {
  id: string;
  receiptNumber: number;
  cashierId: string;
  storeId: string;
  grandTotal: number;
  createdAt: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
}

export interface CompensationAdjustmentEntry {
  id: string;
  originalOrderId: string;
  cashierId: string;
  storeId: string;
  type: OrderAdjustmentType;
  status: OrderAdjustmentStatus;
  refundAmount: number;
  additionalChargeAmount: number;
  netAmount: number;
  notes?: string | null;
  createdAt: string;
}

export interface EmployeeCompensationPayout {
  id: string;
  userId: string;
  user?: Pick<User, 'id' | 'email' | 'role'>;
  periodStart: string;
  periodEnd: string;
  baseSalaryAmount: number;
  commissionPercentSnapshot: number;
  commissionableSalesAmount: number;
  commissionAmount: number;
  adjustmentAmount: number;
  totalPayableAmount: number;
  status: PayoutStatus;
  paidAt?: string | null;
  notes?: string | null;
  generatedById?: string | null;
  generatedBy?: Pick<User, 'id' | 'email' | 'role'> | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePayoutPayload {
  status: PayoutStatus;
  notes?: string;
}

export interface CompensationDetailResponse extends CompensationSummaryItem {
  periodStart: string;
  periodEnd: string;
  orders: CompensationOrderEntry[];
  adjustments: CompensationAdjustmentEntry[];
  payouts: EmployeeCompensationPayout[];
}

export type { PayoutFormData } from '@/schemas/compensation';
