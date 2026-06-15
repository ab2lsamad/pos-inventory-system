import type { InventoryLevel } from './inventory';

export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  totalProducts: number;
  lowStockProducts: InventoryLevel[];
}
