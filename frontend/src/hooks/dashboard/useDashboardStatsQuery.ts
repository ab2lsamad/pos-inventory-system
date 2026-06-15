'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useErrorToast } from '@/hooks/shared/useErrorToast';
import { useRestockStore } from '@/store/restock-store';
import { toNumber } from '@/lib/money';
import type { DashboardStats } from '@/types/dashboard';
import type { Order } from '@/types/order';
import type { Product } from '@/types/product';
import type { InventoryLevel } from '@/types/inventory';
import type { PaginatedResponse } from '@/types/shared';

interface DashboardData {
  stats: DashboardStats;
  recentOrders: Order[];
}

export function useDashboardStatsQuery() {
  const showError = useErrorToast();
  // Restock watchlist is scoped to the categories the user picked in Settings.
  // No categories selected → no watchlist (we don't even hit the endpoint).
  const restockCategoryIds = useRestockStore((s) => s.categoryIds);

  const query = useQuery<DashboardData>({
    queryKey: ['dashboard', 'stats', restockCategoryIds],
    queryFn: async () => {
      // Local-day boundaries (sent as instants) so today's totals match the
      // user's timezone. Stats are aggregated server-side — never page-capped.
      const now = new Date();
      const dayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).toISOString();
      const dayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      ).toISOString();

      const [statsResponse, recentResponse, productsResponse] =
        await Promise.all([
          api.get<{ orderCount: number; revenue: string | number }>(
            API_ENDPOINTS.orders.stats({ from: dayStart, to: dayEnd }),
          ),
          api.get<PaginatedResponse<Order>>(
            API_ENDPOINTS.orders.list(1, 5, { from: dayStart, to: dayEnd }),
          ),
          api.get<PaginatedResponse<Product>>(
            API_ENDPOINTS.products.list(1, 1),
          ),
        ]);

      let lowStockProducts: InventoryLevel[] = [];
      if (restockCategoryIds.length > 0) {
        const lowStockResponse = await api.get<PaginatedResponse<InventoryLevel>>(
          API_ENDPOINTS.inventory.levelsList({
            lowStockOnly: true,
            limit: 100,
            categoryIds: restockCategoryIds.join(','),
          }),
        );
        lowStockProducts = lowStockResponse.data.data ?? [];
      }

      return {
        stats: {
          todayOrders: statsResponse.data.orderCount ?? 0,
          todayRevenue: toNumber(statsResponse.data.revenue ?? 0),
          totalProducts: productsResponse.data.meta?.total ?? 0,
          lowStockProducts,
        },
        recentOrders: recentResponse.data.data ?? [],
      };
    },
  });

  useEffect(() => {
    if (query.error) {
      showError(query.error, 'Failed to load dashboard');
    }
  }, [query.error, showError]);

  return query;
}
