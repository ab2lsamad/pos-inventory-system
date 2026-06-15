import { Injectable, Logger, RequestTimeoutException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from '../shared/utils/decimal.util';
import { resolveDateRange } from '../shared/utils/date-range.util';
import { ReportRangeQueryDto } from './dto/report-range-query.dto';

// Orders that represent a sale that actually happened. Refunds against them are
// tracked separately via OrderAdjustment so they are never double-counted.
const SALE_STATUSES = ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED'];

// Bound a single report query independently of the request socket so a runaway
// scan fails fast with a clear message instead of hanging until a proxy 504s.
const STATEMENT_TIMEOUT_MS = 30_000;
const TRANSACTION_TIMEOUT_MS = 35_000;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Coerce a raw-query value (bigint | Decimal | number | string) to number. */
const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'number') return v;
  return toNumber(v as Prisma.Decimal | string);
};

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Infrastructure
  // ---------------------------------------------------------------------------

  /**
   * Runs one aggregate query under a per-statement timeout. Aggregation stays
   * entirely in Postgres (GROUP BY / SUM), so the payload is independent of how
   * many orders exist — only the grouped result set crosses the wire.
   */
  private async run<T>(sql: Prisma.Sql): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe(
            `SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`,
          );
          return tx.$queryRaw<T>(sql);
        },
        { timeout: TRANSACTION_TIMEOUT_MS },
      );
    } catch (error) {
      const message = String((error as Error)?.message ?? '');
      if (
        (error as { code?: string })?.code === '57014' ||
        /statement timeout/i.test(message)
      ) {
        throw new RequestTimeoutException(
          'Report timed out. Narrow the date range and try again.',
        );
      }
      this.logger.error(error);
      throw error;
    }
  }

  private range(query: ReportRangeQueryDto) {
    return resolveDateRange(query.startDate, query.endDate);
  }

  private statusList() {
    return Prisma.join(SALE_STATUSES);
  }

  /**
   * Sale line items in range, each carrying its pro-rata share of any
   * order-level discount. Order-level discounts live in `OrderDiscount` and are
   * never written onto `OrderItem`, so line-level aggregation alone overstates
   * net sales. We allocate them the same way the refund path does
   * (`OrdersService.computeEffectiveUnitRefundMap`): by each line's post-line-
   * discount subtotal share, so every breakdown reconciles to `Order.grandTotal`.
   *
   * Exposes CTEs `od`, `osub`, `li`. `li` columns:
   *   "productId", "variantId", quantity, subtotal, "discountAmount",
   *   "taxAmount", total, order_disc_alloc
   */
  private saleLineCte(start: Date, end: Date) {
    return Prisma.sql`
      od AS (
        SELECT "orderId" AS oid, SUM(amount) AS od_sum
        FROM "OrderDiscount"
        GROUP BY "orderId"
      ),
      osub AS (
        SELECT "orderId" AS oid, SUM(subtotal) AS sub_sum
        FROM "OrderItem"
        GROUP BY "orderId"
      ),
      li AS (
        SELECT oi."productId", oi."variantId", oi.quantity,
               oi.subtotal, oi."discountAmount", oi."taxAmount", oi.total,
               CASE WHEN COALESCE(osub.sub_sum, 0) > 0
                    THEN COALESCE(od.od_sum, 0) * oi.subtotal / osub.sub_sum
                    ELSE 0 END AS order_disc_alloc
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        LEFT JOIN od ON od.oid = oi."orderId"
        LEFT JOIN osub ON osub.oid = oi."orderId"
        WHERE o.status::text IN (${this.statusList()})
          AND o."createdAt" BETWEEN ${start} AND ${end}
      )`;
  }

  private paging(query: ReportRangeQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 25));
    const offset = (page - 1) * limit;
    const clause = query.all
      ? Prisma.empty
      : Prisma.sql`LIMIT ${limit} OFFSET ${offset}`;
    return { page, limit, offset, clause };
  }

  private pageMeta(query: ReportRangeQueryDto, total: number) {
    const { page, limit } = this.paging(query);
    if (query.all) {
      return { total, page: 1, limit: total, totalPages: 1 };
    }
    return { total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  private rangeInfo(start: Date, end: Date) {
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  // ---------------------------------------------------------------------------
  // Summary — Sales / Refund / Revenue / Cost / Profit (count + total)
  // ---------------------------------------------------------------------------

  async summary(query: ReportRangeQueryDto) {
    const { start, end } = this.range(query);
    const rows = await this.run<Record<string, unknown>[]>(Prisma.sql`
      WITH sale_orders AS (
        SELECT id, "grandTotal" FROM "Order"
        WHERE status::text IN (${this.statusList()})
          AND "createdAt" BETWEEN ${start} AND ${end}
      ),
      refunds AS (
        SELECT COUNT(*)::bigint AS c, COALESCE(SUM("refundAmount"), 0) AS v
        FROM "OrderAdjustment"
        WHERE status::text = 'COMPLETED' AND "refundAmount" > 0
          AND "createdAt" BETWEEN ${start} AND ${end}
      ),
      cogs_sold AS (
        SELECT COALESCE(SUM(oi."unitCostSnapshot" * oi.quantity), 0) AS v
        FROM "OrderItem" oi
        WHERE oi."orderId" IN (SELECT id FROM sale_orders)
      ),
      cogs_returned AS (
        SELECT COALESCE(SUM(oi."unitCostSnapshot" * ri.quantity), 0) AS v
        FROM "OrderAdjustmentReturnItem" ri
        JOIN "OrderAdjustment" a ON a.id = ri."adjustmentId"
        JOIN "OrderItem" oi ON oi.id = ri."orderItemId"
        WHERE a.status::text = 'COMPLETED' AND ri.restock = true
          AND a."createdAt" BETWEEN ${start} AND ${end}
      )
      SELECT
        (SELECT COUNT(*)::bigint FROM sale_orders) AS sales_count,
        (SELECT COALESCE(SUM("grandTotal"), 0) FROM sale_orders) AS sales_total,
        (SELECT c FROM refunds) AS refund_count,
        (SELECT v FROM refunds) AS refund_total,
        (SELECT v FROM cogs_sold) AS cogs_sold,
        (SELECT v FROM cogs_returned) AS cogs_returned
    `);

    const r = rows[0] ?? {};
    const salesCount = num(r.sales_count);
    const salesTotal = round2(num(r.sales_total));
    const refundCount = num(r.refund_count);
    const refundTotal = round2(num(r.refund_total));
    const revenue = round2(salesTotal - refundTotal);
    const cost = round2(num(r.cogs_sold) - num(r.cogs_returned));
    const profit = round2(revenue - cost);

    return {
      ...this.rangeInfo(start, end),
      rows: [
        { key: 'sales', label: 'Sales', count: salesCount, total: salesTotal },
        {
          key: 'refund',
          label: 'Refund',
          count: refundCount,
          total: refundTotal,
        },
        { key: 'revenue', label: 'Revenue', count: null, total: revenue },
        { key: 'cost', label: 'Cost', count: null, total: cost },
        { key: 'profit', label: 'Profit', count: null, total: profit },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Sales count — by payment method
  // ---------------------------------------------------------------------------

  async salesCount(query: ReportRangeQueryDto) {
    const { start, end } = this.range(query);
    const rows = await this.run<Record<string, unknown>[]>(Prisma.sql`
      WITH s AS (
        SELECT "paymentMethod" AS pm, COUNT(*)::bigint AS cnt,
               COALESCE(SUM("grandTotal"), 0) AS total
        FROM "Order"
        WHERE status::text IN (${this.statusList()})
          AND "createdAt" BETWEEN ${start} AND ${end}
        GROUP BY "paymentMethod"
      ),
      r AS (
        SELECT "paymentMethod" AS pm, COUNT(*)::bigint AS cnt,
               COALESCE(SUM("refundAmount"), 0) AS total
        FROM "OrderAdjustment"
        WHERE status::text = 'COMPLETED' AND "refundAmount" > 0
          AND "createdAt" BETWEEN ${start} AND ${end}
        GROUP BY "paymentMethod"
      )
      SELECT COALESCE(s.pm, r.pm) AS payment_method,
        COALESCE(s.cnt, 0) AS sales_count, COALESCE(s.total, 0) AS sales_total,
        COALESCE(r.cnt, 0) AS refund_count, COALESCE(r.total, 0) AS refund_total
      FROM s FULL OUTER JOIN r ON s.pm = r.pm
      ORDER BY payment_method
    `);

    return {
      ...this.rangeInfo(start, end),
      data: rows.map((row) => {
        const salesTotal = round2(num(row.sales_total));
        const refundTotal = round2(num(row.refund_total));
        return {
          paymentMethod: row.payment_method as string,
          salesCount: num(row.sales_count),
          salesTotal,
          refundCount: num(row.refund_count),
          refundTotal,
          balance: round2(salesTotal - refundTotal),
        };
      }),
    };
  }

  // ---------------------------------------------------------------------------
  // Product sales — paginated
  // ---------------------------------------------------------------------------

  async productSales(query: ReportRangeQueryDto) {
    const { start, end } = this.range(query);
    const { clause } = this.paging(query);
    const rows = await this.run<Record<string, unknown>[]>(Prisma.sql`
      WITH ${this.saleLineCte(start, end)},
      s AS (
        SELECT li."productId" AS pid,
               SUM(li.quantity)::bigint AS qty,
               COALESCE(SUM(li.subtotal + li."discountAmount"), 0) AS gross,
               COALESCE(SUM(li."discountAmount"), 0) AS item_disc,
               COALESCE(SUM(li.order_disc_alloc), 0) AS order_disc,
               COALESCE(SUM(li."taxAmount"), 0) AS tax,
               COALESCE(SUM(li.total - li.order_disc_alloc), 0) AS net
        FROM li
        GROUP BY li."productId"
      ),
      r AS (
        SELECT ri."productId" AS pid,
               SUM(ri.quantity)::bigint AS qty,
               COALESCE(SUM(ri.subtotal), 0) AS total
        FROM "OrderAdjustmentReturnItem" ri
        JOIN "OrderAdjustment" a ON a.id = ri."adjustmentId"
        WHERE a.status::text = 'COMPLETED'
          AND a."createdAt" BETWEEN ${start} AND ${end}
        GROUP BY ri."productId"
      ),
      m AS (
        SELECT COALESCE(s.pid, r.pid) AS pid,
          COALESCE(s.qty, 0) AS qty_sold,
          COALESCE(s.gross, 0) AS gross,
          COALESCE(s.item_disc, 0) AS item_disc,
          COALESCE(s.order_disc, 0) AS order_disc,
          COALESCE(s.tax, 0) AS tax,
          COALESCE(s.net, 0) AS net,
          COALESCE(r.qty, 0) AS qty_refunded,
          COALESCE(r.total, 0) AS refund_total
        FROM s FULL OUTER JOIN r ON s.pid = r.pid
      )
      SELECT m.*, p.name AS label, p.sku AS sku, COUNT(*) OVER() AS total_count
      FROM m JOIN "Product" p ON p.id = m.pid
      ORDER BY net DESC, label ASC
      ${clause}
    `);

    const total = rows.length ? num(rows[0].total_count) : 0;
    return {
      ...this.rangeInfo(start, end),
      data: rows.map((row) => {
        const net = round2(num(row.net));
        const refundTotal = round2(num(row.refund_total));
        return {
          productName: row.label as string,
          sku: row.sku as string,
          qtySold: num(row.qty_sold),
          gross: round2(num(row.gross)),
          itemDiscount: round2(num(row.item_disc)),
          orderDiscount: round2(num(row.order_disc)),
          tax: round2(num(row.tax)),
          net,
          qtyRefunded: num(row.qty_refunded),
          refundTotal,
          balance: round2(net - refundTotal),
        };
      }),
      meta: this.pageMeta(query, total),
    };
  }

  // ---------------------------------------------------------------------------
  // Category sales — paginated
  // ---------------------------------------------------------------------------

  async categorySales(query: ReportRangeQueryDto) {
    const { start, end } = this.range(query);
    const { clause } = this.paging(query);
    const rows = await this.run<Record<string, unknown>[]>(Prisma.sql`
      WITH ${this.saleLineCte(start, end)},
      s AS (
        SELECT COALESCE(p."categoryId", '__none__') AS cid,
               SUM(li.quantity)::bigint AS qty,
               COALESCE(SUM(li.subtotal + li."discountAmount"), 0) AS gross,
               COALESCE(SUM(li."discountAmount"), 0) AS item_disc,
               COALESCE(SUM(li.order_disc_alloc), 0) AS order_disc,
               COALESCE(SUM(li."taxAmount"), 0) AS tax,
               COALESCE(SUM(li.total - li.order_disc_alloc), 0) AS net
        FROM li
        JOIN "Product" p ON p.id = li."productId"
        GROUP BY COALESCE(p."categoryId", '__none__')
      ),
      r AS (
        SELECT COALESCE(p."categoryId", '__none__') AS cid,
               SUM(ri.quantity)::bigint AS qty,
               COALESCE(SUM(ri.subtotal), 0) AS total
        FROM "OrderAdjustmentReturnItem" ri
        JOIN "OrderAdjustment" a ON a.id = ri."adjustmentId"
        JOIN "Product" p ON p.id = ri."productId"
        WHERE a.status::text = 'COMPLETED'
          AND a."createdAt" BETWEEN ${start} AND ${end}
        GROUP BY COALESCE(p."categoryId", '__none__')
      ),
      m AS (
        SELECT COALESCE(s.cid, r.cid) AS cid,
          COALESCE(s.qty, 0) AS qty_sold,
          COALESCE(s.gross, 0) AS gross,
          COALESCE(s.item_disc, 0) AS item_disc,
          COALESCE(s.order_disc, 0) AS order_disc,
          COALESCE(s.tax, 0) AS tax,
          COALESCE(s.net, 0) AS net,
          COALESCE(r.qty, 0) AS qty_refunded, COALESCE(r.total, 0) AS refund_total
        FROM s FULL OUTER JOIN r ON s.cid = r.cid
      )
      SELECT m.*, COALESCE(c.name, '(uncategorized)') AS label,
             COUNT(*) OVER() AS total_count
      FROM m LEFT JOIN "Category" c ON c.id = m.cid
      ORDER BY net DESC, label ASC
      ${clause}
    `);

    const total = rows.length ? num(rows[0].total_count) : 0;
    return {
      ...this.rangeInfo(start, end),
      data: rows.map((row) => {
        const net = round2(num(row.net));
        const refundTotal = round2(num(row.refund_total));
        return {
          categoryName: row.label as string,
          qtySold: num(row.qty_sold),
          gross: round2(num(row.gross)),
          itemDiscount: round2(num(row.item_disc)),
          orderDiscount: round2(num(row.order_disc)),
          tax: round2(num(row.tax)),
          net,
          qtyRefunded: num(row.qty_refunded),
          refundTotal,
          balance: round2(net - refundTotal),
        };
      }),
      meta: this.pageMeta(query, total),
    };
  }

  // ---------------------------------------------------------------------------
  // Supplier sales — paginated (primary supplier = lowest costPrice per variant)
  // ---------------------------------------------------------------------------

  async supplierSales(query: ReportRangeQueryDto) {
    const { start, end } = this.range(query);
    const { clause } = this.paging(query);
    const rows = await this.run<Record<string, unknown>[]>(Prisma.sql`
      WITH ${this.saleLineCte(start, end)},
      ps AS (
        SELECT DISTINCT ON (sp."variantId") sp."variantId" AS vid,
               sp."supplierId" AS sid
        FROM "SupplierProduct" sp
        ORDER BY sp."variantId", sp."costPrice" ASC, sp."supplierId" ASC
      ),
      s AS (
        SELECT COALESCE(ps.sid, '__none__') AS sid,
               SUM(li.quantity)::bigint AS qty,
               COALESCE(SUM(li.subtotal + li."discountAmount"), 0) AS gross,
               COALESCE(SUM(li."discountAmount"), 0) AS item_disc,
               COALESCE(SUM(li.order_disc_alloc), 0) AS order_disc,
               COALESCE(SUM(li."taxAmount"), 0) AS tax,
               COALESCE(SUM(li.total - li.order_disc_alloc), 0) AS net
        FROM li
        LEFT JOIN ps ON ps.vid = li."variantId"
        GROUP BY COALESCE(ps.sid, '__none__')
      ),
      r AS (
        SELECT COALESCE(ps.sid, '__none__') AS sid,
               SUM(ri.quantity)::bigint AS qty,
               COALESCE(SUM(ri.subtotal), 0) AS total
        FROM "OrderAdjustmentReturnItem" ri
        JOIN "OrderAdjustment" a ON a.id = ri."adjustmentId"
        LEFT JOIN ps ON ps.vid = ri."variantId"
        WHERE a.status::text = 'COMPLETED'
          AND a."createdAt" BETWEEN ${start} AND ${end}
        GROUP BY COALESCE(ps.sid, '__none__')
      ),
      m AS (
        SELECT COALESCE(s.sid, r.sid) AS sid,
          COALESCE(s.qty, 0) AS qty_sold,
          COALESCE(s.gross, 0) AS gross,
          COALESCE(s.item_disc, 0) AS item_disc,
          COALESCE(s.order_disc, 0) AS order_disc,
          COALESCE(s.tax, 0) AS tax,
          COALESCE(s.net, 0) AS net,
          COALESCE(r.qty, 0) AS qty_refunded, COALESCE(r.total, 0) AS refund_total
        FROM s FULL OUTER JOIN r ON s.sid = r.sid
      )
      SELECT m.*, COALESCE(sup.name, '(no supplier)') AS label,
             COUNT(*) OVER() AS total_count
      FROM m LEFT JOIN "Supplier" sup ON sup.id = m.sid
      ORDER BY net DESC, label ASC
      ${clause}
    `);

    const total = rows.length ? num(rows[0].total_count) : 0;
    return {
      ...this.rangeInfo(start, end),
      data: rows.map((row) => {
        const net = round2(num(row.net));
        const refundTotal = round2(num(row.refund_total));
        return {
          supplierName: row.label as string,
          qtySold: num(row.qty_sold),
          gross: round2(num(row.gross)),
          itemDiscount: round2(num(row.item_disc)),
          orderDiscount: round2(num(row.order_disc)),
          tax: round2(num(row.tax)),
          net,
          qtyRefunded: num(row.qty_refunded),
          refundTotal,
          balance: round2(net - refundTotal),
        };
      }),
      meta: this.pageMeta(query, total),
    };
  }

  // ---------------------------------------------------------------------------
  // Store sales — every store
  // ---------------------------------------------------------------------------

  async storeSales(query: ReportRangeQueryDto) {
    const { start, end } = this.range(query);
    const rows = await this.run<Record<string, unknown>[]>(Prisma.sql`
      WITH s AS (
        SELECT "storeId" AS sid, COUNT(*)::bigint AS cnt,
               COALESCE(SUM("grandTotal"), 0) AS total
        FROM "Order"
        WHERE status::text IN (${this.statusList()})
          AND "createdAt" BETWEEN ${start} AND ${end}
        GROUP BY "storeId"
      ),
      r AS (
        SELECT "storeId" AS sid, COUNT(*)::bigint AS cnt,
               COALESCE(SUM("refundAmount"), 0) AS total
        FROM "OrderAdjustment"
        WHERE status::text = 'COMPLETED' AND "refundAmount" > 0
          AND "createdAt" BETWEEN ${start} AND ${end}
        GROUP BY "storeId"
      )
      SELECT st.name AS label,
        COALESCE(s.cnt, 0) AS sales_count, COALESCE(s.total, 0) AS sales_total,
        COALESCE(r.cnt, 0) AS refund_count, COALESCE(r.total, 0) AS refund_total
      FROM "Store" st
      LEFT JOIN s ON s.sid = st.id
      LEFT JOIN r ON r.sid = st.id
      ORDER BY sales_total DESC, label ASC
    `);

    return {
      ...this.rangeInfo(start, end),
      data: rows.map((row) => {
        const salesTotal = round2(num(row.sales_total));
        const refundTotal = round2(num(row.refund_total));
        return {
          storeName: row.label as string,
          salesCount: num(row.sales_count),
          salesTotal,
          refundCount: num(row.refund_count),
          refundTotal,
          balance: round2(salesTotal - refundTotal),
        };
      }),
    };
  }

  // ---------------------------------------------------------------------------
  // User sales — cashiers with activity in range
  // ---------------------------------------------------------------------------

  async userSales(query: ReportRangeQueryDto) {
    const { start, end } = this.range(query);
    const rows = await this.run<Record<string, unknown>[]>(Prisma.sql`
      WITH s AS (
        SELECT "cashierId" AS uid, COUNT(*)::bigint AS cnt,
               COALESCE(SUM("grandTotal"), 0) AS total
        FROM "Order"
        WHERE status::text IN (${this.statusList()})
          AND "createdAt" BETWEEN ${start} AND ${end}
        GROUP BY "cashierId"
      ),
      r AS (
        SELECT "cashierId" AS uid, COUNT(*)::bigint AS cnt,
               COALESCE(SUM("refundAmount"), 0) AS total
        FROM "OrderAdjustment"
        WHERE status::text = 'COMPLETED' AND "refundAmount" > 0
          AND "createdAt" BETWEEN ${start} AND ${end}
        GROUP BY "cashierId"
      ),
      m AS (
        SELECT COALESCE(s.uid, r.uid) AS uid,
          COALESCE(s.cnt, 0) AS sales_count, COALESCE(s.total, 0) AS sales_total,
          COALESCE(r.cnt, 0) AS refund_count, COALESCE(r.total, 0) AS refund_total
        FROM s FULL OUTER JOIN r ON s.uid = r.uid
      )
      SELECT m.*, COALESCE(u."fullName", u.email) AS label
      FROM m JOIN "User" u ON u.id = m.uid
      ORDER BY sales_total DESC, label ASC
    `);

    return {
      ...this.rangeInfo(start, end),
      data: rows.map((row) => {
        const salesTotal = round2(num(row.sales_total));
        const refundTotal = round2(num(row.refund_total));
        return {
          cashierName: row.label as string,
          salesCount: num(row.sales_count),
          salesTotal,
          refundCount: num(row.refund_count),
          refundTotal,
          balance: round2(salesTotal - refundTotal),
        };
      }),
    };
  }

  // ---------------------------------------------------------------------------
  // Tax breakdown — single aggregate row; refund tax pro-rated from order items
  // ---------------------------------------------------------------------------

  async taxBreakdown(query: ReportRangeQueryDto) {
    const { start, end } = this.range(query);
    const rows = await this.run<Record<string, unknown>[]>(Prisma.sql`
      WITH ${this.saleLineCte(start, end)},
      s AS (
        SELECT COALESCE(SUM(li.quantity), 0)::bigint AS item_count,
               COALESCE(SUM(li.subtotal), 0) AS subtotal,
               COALESCE(SUM(li."taxAmount"), 0) AS tax,
               COALESCE(SUM(li.order_disc_alloc), 0) AS order_disc
        FROM li
      ),
      r AS (
        SELECT COALESCE(SUM(ri.quantity), 0)::bigint AS item_count,
               COALESCE(SUM(ri.subtotal), 0) AS subtotal,
               COALESCE(
                 SUM(oi."taxAmount" * ri.quantity / NULLIF(oi.quantity, 0)), 0
               ) AS tax
        FROM "OrderAdjustmentReturnItem" ri
        JOIN "OrderAdjustment" a ON a.id = ri."adjustmentId"
        JOIN "OrderItem" oi ON oi.id = ri."orderItemId"
        WHERE a.status::text = 'COMPLETED'
          AND a."createdAt" BETWEEN ${start} AND ${end}
      )
      SELECT s.item_count AS sale_item_count, s.subtotal AS sale_subtotal,
             s.tax AS sale_tax, s.order_disc AS sale_order_disc,
             r.item_count AS refund_item_count,
             r.subtotal AS refund_subtotal, r.tax AS refund_tax
      FROM s CROSS JOIN r
    `);

    const r = rows[0] ?? {};
    const saleSubtotal = round2(num(r.sale_subtotal));
    const saleTax = round2(num(r.sale_tax));
    // Order-level discounts are applied AFTER tax (they reduce grandTotal but
    // not the taxable base), so taxes are reported as-is. We surface the
    // allocated order discount and net sales so this report reconciles to the
    // summary: netSales = saleSubtotal + saleTax - orderDiscount.
    const orderDiscount = round2(num(r.sale_order_disc));
    const refundTax = round2(num(r.refund_tax));
    return {
      ...this.rangeInfo(start, end),
      data: [
        {
          itemCount: num(r.sale_item_count),
          saleSubtotal,
          saleTax,
          orderDiscount,
          netSales: round2(saleSubtotal + saleTax - orderDiscount),
          refundItemCount: num(r.refund_item_count),
          refundSubtotal: round2(num(r.refund_subtotal)),
          refundTax,
          totalTax: round2(saleTax - refundTax),
        },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Current stock — today only, no date range; paginated
  // ---------------------------------------------------------------------------

  async currentStock(query: ReportRangeQueryDto) {
    const { clause } = this.paging(query);
    const rows = await this.run<Record<string, unknown>[]>(Prisma.sql`
      WITH ps AS (
        SELECT DISTINCT ON (sp."variantId") sp."variantId" AS vid,
               sp."supplierId" AS sid
        FROM "SupplierProduct" sp
        ORDER BY sp."variantId", sp."costPrice" ASC, sp."supplierId" ASC
      )
      SELECT p.name AS product_name, v.name AS variant_name, v.sku AS sku,
             COALESCE(sup.name, '(no supplier)') AS supplier,
             st.name AS store, il.quantity AS qty,
             (il.quantity * v.cost) AS stock_value,
             COUNT(*) OVER() AS total_count
      FROM "InventoryLevel" il
      JOIN "ProductVariant" v ON v.id = il."variantId"
      JOIN "Product" p ON p.id = v."productId"
      JOIN "Store" st ON st.id = il."storeId"
      LEFT JOIN ps ON ps.vid = il."variantId"
      LEFT JOIN "Supplier" sup ON sup.id = ps.sid
      WHERE il.quantity > 0
      ORDER BY stock_value DESC, product_name ASC
      ${clause}
    `);

    const total = rows.length ? num(rows[0].total_count) : 0;
    return {
      generatedAt: new Date().toISOString(),
      data: rows.map((row) => ({
        productName: `${row.product_name as string} — ${row.variant_name as string}`,
        sku: row.sku as string,
        supplier: row.supplier as string,
        store: row.store as string,
        stockQty: num(row.qty),
        stockValue: round2(num(row.stock_value)),
      })),
      meta: this.pageMeta(query, total),
    };
  }
}
