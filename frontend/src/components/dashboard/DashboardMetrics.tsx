'use client';

import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  PackageSearch,
  ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';
import { useDashboardStatsQuery } from '@/hooks/dashboard/useDashboardStatsQuery';
import { useRestockStore } from '@/store/restock-store';
import { toNumber } from '@/lib/money';
import type { DashboardStats } from '@/types/dashboard';
import type { Order } from '@/types/order';
import StatusBadge from '@/components/ui/StatusBadge';

function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(typeof amount === 'string' ? toNumber(amount) : amount);
}

function StatCard({
  title,
  value,
  hint,
  icon,
  accent,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="glass-card relative overflow-hidden p-6">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
            {value}
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <ArrowUpRight size={16} className="text-[var(--accent)]" />
            {hint}
          </p>
        </div>
        <div className="rounded-[1.4rem] bg-white/80 p-4 text-[var(--accent)] border border-[var(--border-glass)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardMetrics() {
  const { data, isLoading } = useDashboardStatsQuery();
  const hasRestockCategories = useRestockStore((s) => s.categoryIds.length > 0);
  const stats: DashboardStats = data?.stats ?? {
    todayOrders: 0,
    todayRevenue: 0,
    totalProducts: 0,
    lowStockProducts: [],
  };
  const recentOrders = data?.recentOrders ?? [];

  return (
    <div className="flex flex-col section-gap">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, index) => (
            <div key={index} className="skeleton h-40 rounded-[1.5rem]" />
          ))
        ) : (
          <>
            <StatCard
              title="Gross Revenue"
              value={formatCurrency(stats.todayRevenue)}
              hint="Revenue generated today"
              icon={<CircleDollarSign size={24} />}
              accent="bg-gradient-to-r from-emerald-500 to-teal-500"
            />
            <StatCard
              title="Orders Today"
              value={String(stats.todayOrders)}
              hint="Transactions completed this shift"
              icon={<ShoppingCart size={24} />}
              accent="bg-gradient-to-r from-sky-500 to-blue-500"
            />
            <StatCard
              title="Products"
              value={String(stats.totalProducts)}
              hint="Sellable items in catalog"
              icon={<Boxes size={24} />}
              accent="bg-gradient-to-r from-amber-500 to-orange-500"
            />
            <StatCard
              title="Restock Alerts"
              value={String(stats.lowStockProducts.length)}
              hint="Items at or below reorder point"
              icon={<AlertTriangle size={24} />}
              accent="bg-gradient-to-r from-rose-500 to-red-500"
            />
          </>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.9fr)]">
        <div className="glass-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-6 py-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Latest Sales
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-[var(--text-primary)]">
                Recent Orders
              </h2>
            </div>
            <span className="metric-chip">{recentOrders.length} visible</span>
          </div>

          <div className="max-h-[34rem] space-y-3 overflow-y-auto p-4">
            {isLoading ? (
              [...Array(5)].map((_, index) => (
                <div key={index} className="skeleton h-24 rounded-[1.25rem]" />
              ))
            ) : recentOrders.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-[var(--text-muted)]">
                <ShoppingCart size={28} />
                <p className="text-sm font-semibold">No orders have been captured yet.</p>
              </div>
            ) : (
              recentOrders.map((order: Order) => (
                <div
                  key={order.id}
                  className="rounded-[1.4rem] border border-[var(--border-glass)] bg-white/70 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black tracking-tight text-[var(--text-primary)]">
                        {order.receiptNumber
                          ? `Receipt #${order.receiptNumber}`
                          : `Order #${order.id.slice(0, 8)}`}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {order.cashier?.email ?? 'Unknown cashier'} |{' '}
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge kind="order" status={order.status} />
                      <p className="text-lg font-black text-[var(--accent)]">
                        {formatCurrency(order.grandTotal)}
                      </p>
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--border-glass)] bg-white/80 px-3 py-1.5 text-xs font-bold text-[var(--accent)] transition hover:bg-white"
                        title="View order"
                        aria-label="View order"
                      >
                        View
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-6 py-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Inventory Heat
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-[var(--text-primary)]">
                Restock Watchlist
              </h2>
            </div>
            <PackageSearch size={20} className="text-[var(--accent)]" />
          </div>

          <div className="space-y-3 p-4">
            {isLoading ? (
              [...Array(5)].map((_, index) => (
                <div key={index} className="skeleton h-20 rounded-[1.25rem]" />
              ))
            ) : !hasRestockCategories ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center text-[var(--text-muted)]">
                <PackageSearch size={28} />
                <p className="text-sm font-semibold">No restock categories configured.</p>
                <p className="text-xs">
                  Choose which product categories to monitor in{' '}
                  <Link
                    href="/settings"
                    className="font-semibold text-[var(--accent)] hover:underline"
                  >
                    Settings → Restock Alerts
                  </Link>
                  .
                </p>
              </div>
            ) : stats.lowStockProducts.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-[var(--text-muted)]">
                <PackageSearch size={28} />
                <p className="text-sm font-semibold">No urgent stock warnings right now.</p>
              </div>
            ) : (
              stats.lowStockProducts.slice(0, 6).map((level) => (
                <div
                  key={level.id}
                  className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-[var(--border-glass)] bg-white/70 px-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--text-primary)]">
                      {level.variant?.product?.name ??
                        level.variant?.name ??
                        'Unknown product'}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-[var(--text-muted)]">
                      {level.variant?.sku ?? '—'}
                      {level.store?.name ? ` · ${level.store.name}` : ''}
                    </p>
                  </div>
                  <span className="metric-chip whitespace-nowrap text-rose-600">
                    {level.quantity} / {level.reorderPoint} left
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
