import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderAdjustmentType,
  OrderStatus,
  PaymentMethod,
  Prisma,
  Role,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderAdjustmentDto } from './dto/create-order-adjustment.dto';
import {
  multiplyDecimals,
  percentOf,
  sumDecimals,
  toDecimal,
} from '../shared/utils/decimal.util';
import {
  AuthUser,
  assertStoreAccess,
  resolveStoreScope,
} from '../shared/utils/store-scope.util';

const orderInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: {
    include: {
      product: { select: { id: true, name: true } },
      variant: { select: { id: true, name: true, sku: true, barcode: true } },
      itemDiscounts: true,
    },
  },
  discounts: true,
  customer: { select: { id: true, fullName: true, phone: true } },
  cashier: { select: { id: true, email: true, fullName: true } },
  salesperson: { select: { id: true, email: true, fullName: true } },
  store: {
    select: {
      id: true,
      name: true,
      code: true,
      currency: true,
      location: true,
      phone: true,
    },
  },
});

const adjustmentInclude = Prisma.validator<Prisma.OrderAdjustmentInclude>()({
  cashier: { select: { id: true, email: true, fullName: true } },
  salesperson: { select: { id: true, email: true, fullName: true } },
  store: {
    select: {
      id: true,
      name: true,
      code: true,
      currency: true,
      location: true,
      phone: true,
    },
  },
  originalOrder: {
    select: {
      id: true,
      receiptNumber: true,
      createdAt: true,
      customer: { select: { id: true, fullName: true, phone: true } },
    },
  },
  returnItems: { include: { orderItem: true, variant: true } },
  saleItems: { include: { variant: true, itemDiscounts: true } },
});

type Tx = Prisma.TransactionClient;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
  ) {}

  // Enforce per-variant targeting on catalog LINE_ITEM discounts. A targeted
  // discount (non-empty target set) may only be applied to a line whose variant
  // is in that set; an empty target set is unrestricted. Manual discounts (no
  // discountId) are never restricted.
  private async assertLineDiscountTargets(
    tx: Tx,
    lines: { variantId: string; discountIds: string[] }[],
  ) {
    const referencedIds = [...new Set(lines.flatMap((l) => l.discountIds))];
    if (referencedIds.length === 0) return;

    const discounts = await tx.discount.findMany({
      where: { id: { in: referencedIds }, scope: 'LINE_ITEM' },
      include: { targetVariants: { select: { variantId: true } } },
    });
    const targetMap = new Map(
      discounts.map((d) => [
        d.id,
        new Set(d.targetVariants.map((t) => t.variantId)),
      ]),
    );

    for (const line of lines) {
      for (const discountId of line.discountIds) {
        const targets = targetMap.get(discountId);
        if (targets && targets.size > 0 && !targets.has(line.variantId))
          throw new BadRequestException(
            'A selected discount is not valid for one of the items in this order',
          );
      }
    }
  }

  // Validate the optional salesperson credited for a sale: must be an active
  // EMPLOYEE, and — if assigned to a store — that store must match the order's.
  private async assertValidSalesperson(
    tx: Tx,
    salespersonId: string,
    storeId: string,
  ) {
    const salesperson = await tx.user.findUnique({
      where: { id: salespersonId },
      select: { id: true, role: true, isActive: true, storeId: true },
    });
    if (!salesperson || !salesperson.isActive)
      throw new BadRequestException('Salesperson not found or inactive');
    if (salesperson.role !== Role.EMPLOYEE)
      throw new BadRequestException('Salesperson must have the EMPLOYEE role');
    if (salesperson.storeId && salesperson.storeId !== storeId)
      throw new BadRequestException(
        'Salesperson is not assigned to this store',
      );
  }

  async create(dto: CreateOrderDto, user: AuthUser) {
    const cashierId = user.id;
    // Non-admins can only sell from their own store; admins may target any
    // store but must still supply one in the payload.
    const scopedStoreId = resolveStoreScope(user, dto.storeId);
    if (!scopedStoreId) throw new BadRequestException('storeId is required');
    dto.storeId = scopedStoreId;
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Validate store
        const store = await tx.store.findUnique({ where: { id: dto.storeId } });
        if (!store) throw new BadRequestException('Store not found');

        // Validate customer if provided
        if (dto.customerId) {
          const customer = await tx.customer.findUnique({
            where: { id: dto.customerId },
            select: { id: true },
          });
          if (!customer) throw new BadRequestException('Customer not found');
        }

        // Validate salesperson if provided (EMPLOYEE credited for commission)
        if (dto.salespersonId) {
          await this.assertValidSalesperson(tx, dto.salespersonId, dto.storeId);
        }

        // Load variants with taxRate resolution
        const variantIds = dto.items.map((i) => i.variantId);
        const variants = await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: {
            product: {
              include: {
                taxRate: true,
                category: { include: { taxRate: true } },
              },
            },
          },
        });
        const variantMap = new Map(variants.map((v) => [v.id, v]));

        // Enforce variant targeting on any catalog line-item discounts.
        await this.assertLineDiscountTargets(
          tx,
          dto.items.map((i) => ({
            variantId: i.variantId,
            discountIds: (i.discounts ?? [])
              .map((d) => d.discountId)
              .filter((id): id is string => !!id),
          })),
        );

        // Build line items
        let subtotal = toDecimal(0);
        let discountTotal = toDecimal(0);
        let taxTotal = toDecimal(0);
        const itemsToCreate: Prisma.OrderItemCreateWithoutOrderInput[] = [];

        for (const item of dto.items) {
          const variant = variantMap.get(item.variantId);
          if (!variant)
            throw new BadRequestException(
              `Variant not found: ${item.variantId}`,
            );
          if (!variant.isActive)
            throw new BadRequestException(
              `Variant is inactive: ${variant.name}`,
            );

          const unitPrice = toDecimal(item.unitPrice ?? variant.price);
          const lineGross = multiplyDecimals(unitPrice, item.quantity);
          const lineDiscount = sumDecimals(
            ...(item.discounts?.map((d) => d.amount) ?? []),
          );
          const postDiscount = lineGross.sub(lineDiscount);
          if (postDiscount.lt(0))
            throw new BadRequestException('Line discount exceeds line total');

          const taxRate =
            variant.product.taxRate?.rate ??
            variant.product.category?.taxRate?.rate ??
            0;
          const lineTax = percentOf(postDiscount, taxRate);

          subtotal = subtotal.add(lineGross);
          discountTotal = discountTotal.add(lineDiscount);
          taxTotal = taxTotal.add(lineTax);

          itemsToCreate.push({
            product: { connect: { id: variant.productId } },
            variant: { connect: { id: variant.id } },
            quantity: item.quantity,
            unitPrice,
            unitCostSnapshot: variant.cost,
            discountAmount: lineDiscount,
            taxAmount: lineTax,
            subtotal: postDiscount,
            total: postDiscount.add(lineTax),
            productNameSnapshot: variant.product.name,
            variantNameSnapshot: variant.name,
            variantSkuSnapshot: variant.sku,
            variantBarcodeSnapshot: variant.barcode,
            ...(item.discounts && item.discounts.length > 0
              ? {
                  itemDiscounts: {
                    create: item.discounts.map((d) => ({
                      discountId: d.discountId,
                      description: d.description,
                      amount: d.amount,
                    })),
                  },
                }
              : {}),
          });
        }

        // Order-level discounts
        const orderDiscountTotal = sumDecimals(
          ...(dto.discounts?.map((d) => d.amount) ?? []),
        );
        discountTotal = discountTotal.add(orderDiscountTotal);

        // Grand total must net BOTH line discounts and order discounts off
        // the gross subtotal, then add tax (which was already computed per
        // line against the post-line-discount base).
        const grandTotal = subtotal.sub(discountTotal).add(taxTotal);

        // For order-level discount that exceeds remaining — guard
        if (grandTotal.lt(0))
          throw new BadRequestException('Order discounts exceed order total');

        // Payment validation
        const amountPaid = toDecimal(dto.amountPaid);
        if (amountPaid.lt(grandTotal))
          throw new BadRequestException(
            `Amount paid (${amountPaid}) is less than grand total (${grandTotal})`,
          );
        const changeGiven =
          dto.paymentMethod === PaymentMethod.CASH
            ? amountPaid.sub(grandTotal)
            : toDecimal(0);
        if (
          dto.paymentMethod !== PaymentMethod.CASH &&
          !amountPaid.eq(grandTotal)
        )
          throw new BadRequestException(
            'Non-cash payments must equal grand total exactly',
          );

        // Generate per-store receipt number
        const updatedStore = await tx.store.update({
          where: { id: dto.storeId },
          data: { receiptCounter: { increment: 1 } },
          select: { receiptCounter: true, currency: true },
        });
        const receiptNumber = updatedStore.receiptCounter;

        // Create the order
        const order = await tx.order.create({
          data: {
            receiptNumber,
            store: { connect: { id: dto.storeId } },
            cashier: { connect: { id: cashierId } },
            ...(dto.salespersonId && {
              salesperson: { connect: { id: dto.salespersonId } },
            }),
            ...(dto.customerId && {
              customer: { connect: { id: dto.customerId } },
            }),
            status: OrderStatus.COMPLETED,
            paymentMethod: dto.paymentMethod,
            subtotal,
            discountTotal,
            taxTotal,
            grandTotal,
            amountPaid,
            changeGiven,
            currency: updatedStore.currency,
            notes: dto.notes,
            items: { create: itemsToCreate },
            ...(dto.discounts && dto.discounts.length > 0
              ? {
                  discounts: {
                    create: dto.discounts.map((d) => ({
                      discountId: d.discountId,
                      description: d.description,
                      amount: d.amount,
                    })),
                  },
                }
              : {}),
          },
          include: orderInclude,
        });

        // Decrement inventory and write SALE movements
        for (const item of dto.items) {
          const variant = variantMap.get(item.variantId)!;
          await this.inventory.adjustStock(
            {
              storeId: dto.storeId,
              variantId: item.variantId,
              delta: -item.quantity,
              type: StockMovementType.SALE,
              unitCost: variant.cost,
              referenceType: 'ORDER',
              referenceId: order.id,
              userId: cashierId,
            },
            tx,
          );
        }

        // Increment discount usage counts (linked discounts only)
        const linkedDiscountIds = new Set<string>();
        for (const d of dto.discounts ?? [])
          if (d.discountId) linkedDiscountIds.add(d.discountId);
        for (const i of dto.items)
          for (const d of i.discounts ?? [])
            if (d.discountId) linkedDiscountIds.add(d.discountId);
        if (linkedDiscountIds.size > 0) {
          await tx.discount.updateMany({
            where: { id: { in: [...linkedDiscountIds] } },
            data: { usageCount: { increment: 1 } },
          });
        }

        return order;
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findAll(
    user: AuthUser,
    opts: {
      page?: number;
      limit?: number;
      storeId?: string;
      customerId?: string;
      cashierId?: string;
      salespersonId?: string;
      status?: OrderStatus;
      paymentMethod?: PaymentMethod;
      from?: string;
      to?: string;
      receiptNumber?: number;
    } = {},
  ) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 10;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {};
    // Non-admins are restricted to their own store regardless of the query.
    const scopedStoreId = resolveStoreScope(user, opts.storeId);
    if (scopedStoreId) where.storeId = scopedStoreId;
    if (opts.customerId) where.customerId = opts.customerId;
    if (opts.cashierId) where.cashierId = opts.cashierId;
    if (opts.salespersonId) where.salespersonId = opts.salespersonId;
    if (opts.status) where.status = opts.status;
    if (opts.paymentMethod) where.paymentMethod = opts.paymentMethod;
    if (opts.receiptNumber) where.receiptNumber = opts.receiptNumber;
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from);
      if (opts.to) where.createdAt.lte = new Date(opts.to);
    }
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: orderInclude,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Aggregate order count and gross revenue for a date range, computed in the
  // database so the totals are never capped by a list page size.
  async stats(
    user: AuthUser,
    opts: { storeId?: string; from?: string; to?: string } = {},
  ) {
    const where: Prisma.OrderWhereInput = {};
    const scopedStoreId = resolveStoreScope(user, opts.storeId);
    if (scopedStoreId) where.storeId = scopedStoreId;
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from);
      if (opts.to) where.createdAt.lte = new Date(opts.to);
    }
    const agg = await this.prisma.order.aggregate({
      where,
      _count: { _all: true },
      _sum: { grandTotal: true },
    });
    return {
      orderCount: agg._count._all,
      revenue: agg._sum.grandTotal ?? '0',
    };
  }

  async findOne(id: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    assertStoreAccess(user, order.storeId);
    return order;
  }

  async getReturnSummary(id: string, user: AuthUser) {
    const order = await this.findOne(id, user);
    const returnedMap = await this.getReturnedQuantityMap(id);
    const effectiveUnitMap = this.computeEffectiveUnitRefundMap(order);
    return {
      orderId: order.id,
      receiptNumber: order.receiptNumber,
      storeId: order.storeId,
      cashierId: order.cashierId,
      status: order.status,
      paymentMethod: order.paymentMethod,
      totalAmount: order.grandTotal,
      grandTotal: order.grandTotal,
      refundedTotal: order.refundedTotal,
      createdAt: order.createdAt,
      items: order.items.map((item) => {
        const returned = returnedMap.get(item.id) ?? 0;
        const effectiveUnit =
          effectiveUnitMap.get(item.id) ?? toDecimal(item.unitPrice);
        return {
          id: item.id,
          orderItemId: item.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productNameSnapshot,
          variantName: item.variantNameSnapshot,
          variantSku: item.variantSkuSnapshot,
          barcode: item.variantBarcodeSnapshot,
          unitPrice: item.unitPrice,
          effectiveUnitRefund: effectiveUnit.toFixed(2),
          subtotal: multiplyDecimals(item.unitPrice, item.quantity),
          soldQuantity: item.quantity,
          returnedQuantity: returned,
          remainingReturnableQuantity: Math.max(item.quantity - returned, 0),
        };
      }),
    };
  }

  // Per-unit effective amount actually paid for an OrderItem.
  // Accounts for line-level discount, tax, and pro-rated order-level discount.
  // Order discount is allocated by each line's post-line-discount subtotal share.
  private computeEffectiveUnitRefundMap(
    order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>,
  ): Map<string, Prisma.Decimal> {
    const subtotalsSum = order.items.reduce(
      (acc, it) => acc.add(toDecimal(it.subtotal)),
      toDecimal(0),
    );
    const orderDiscountSum = order.discounts.reduce(
      (acc, d) => acc.add(toDecimal(d.amount)),
      toDecimal(0),
    );
    const map = new Map<string, Prisma.Decimal>();
    for (const item of order.items) {
      const share = subtotalsSum.gt(0)
        ? orderDiscountSum.mul(toDecimal(item.subtotal)).div(subtotalsSum)
        : toDecimal(0);
      const effectiveLineTotal = toDecimal(item.total).sub(share);
      const perUnit =
        item.quantity > 0
          ? effectiveLineTotal.div(item.quantity)
          : toDecimal(0);
      map.set(item.id, perUnit);
    }
    return map;
  }

  async listAdjustments(orderId: string, user: AuthUser) {
    await this.findOne(orderId, user);
    return await this.prisma.orderAdjustment.findMany({
      where: { originalOrderId: orderId },
      include: adjustmentInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAdjustment(id: string, user: AuthUser) {
    const adj = await this.prisma.orderAdjustment.findUnique({
      where: { id },
      include: adjustmentInclude,
    });
    if (!adj) throw new NotFoundException('Adjustment not found');
    assertStoreAccess(user, adj.storeId);
    return adj;
  }

  async createAdjustment(
    orderId: string,
    dto: CreateOrderAdjustmentDto,
    user: AuthUser,
  ) {
    const cashierId = user.id;
    // Lock non-admins to their own store before any work happens.
    const scopedStoreId = resolveStoreScope(user, dto.storeId);
    if (!scopedStoreId) throw new BadRequestException('storeId is required');
    dto.storeId = scopedStoreId;
    const returns = (dto.returns ?? []).filter((r) => r.quantity > 0);
    const sales = (dto.newItems ?? []).filter((s) => s.quantity > 0);
    if (!returns.length && !sales.length)
      throw new BadRequestException(
        'Adjustment must include at least one return item or one new sale item',
      );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: orderInclude,
        });
        if (!order) throw new NotFoundException('Order not found');
        assertStoreAccess(user, order.storeId);
        if (order.status === OrderStatus.CANCELLED)
          throw new BadRequestException('Cancelled orders cannot be adjusted');
        if (order.storeId !== dto.storeId)
          throw new BadRequestException(
            'Adjustment store must match original order store',
          );

        // Compute returns. Refund the actual amount paid per unit, which
        // accounts for line discount, tax, and a pro-rata share of any
        // order-level discount applied at checkout.
        const returnedMap = await this.getReturnedQuantityMap(orderId, tx);
        const effectiveUnitMap = this.computeEffectiveUnitRefundMap(order);
        let refundAmount = toDecimal(0);
        const returnItemsData: Prisma.OrderAdjustmentReturnItemCreateWithoutAdjustmentInput[] =
          [];

        for (const req of returns) {
          const orderItem = order.items.find((i) => i.id === req.orderItemId);
          if (!orderItem)
            throw new NotFoundException(
              `Order item not found: ${req.orderItemId}`,
            );
          const remaining =
            orderItem.quantity - (returnedMap.get(orderItem.id) ?? 0);
          if (req.quantity > remaining)
            throw new BadRequestException(
              `Cannot return more than remaining for ${orderItem.productNameSnapshot}`,
            );

          const effectiveUnit =
            effectiveUnitMap.get(orderItem.id) ??
            toDecimal(orderItem.unitPrice);
          const lineRefund = effectiveUnit.mul(req.quantity);
          refundAmount = refundAmount.add(lineRefund);

          returnItemsData.push({
            orderItem: { connect: { id: orderItem.id } },
            product: { connect: { id: orderItem.productId } },
            variant: { connect: { id: orderItem.variantId } },
            quantity: req.quantity,
            unitPrice: effectiveUnit,
            subtotal: lineRefund,
            restock: req.restock ?? true,
            productNameSnapshot: orderItem.productNameSnapshot,
            variantNameSnapshot: orderItem.variantNameSnapshot,
            variantSkuSnapshot: orderItem.variantSkuSnapshot,
            variantBarcodeSnapshot: orderItem.variantBarcodeSnapshot,
          });
        }

        // Compute new sale items with line discounts + tax (mirrors create()).
        let additionalChargeAmount = toDecimal(0);
        const saleItemsData: Prisma.OrderAdjustmentSaleItemCreateWithoutAdjustmentInput[] =
          [];
        const saleVariantIds = sales.map((s) => s.variantId);
        const saleVariants = saleVariantIds.length
          ? await tx.productVariant.findMany({
              where: { id: { in: saleVariantIds } },
              include: {
                product: {
                  include: {
                    taxRate: true,
                    category: { include: { taxRate: true } },
                  },
                },
              },
            })
          : [];
        const saleVariantMap = new Map(saleVariants.map((v) => [v.id, v]));

        // Enforce variant targeting on any catalog line-item discounts applied
        // to newly sold items in this adjustment/exchange.
        await this.assertLineDiscountTargets(
          tx,
          sales.map((s) => ({
            variantId: s.variantId,
            discountIds: (s.discounts ?? [])
              .map((d) => d.discountId)
              .filter((id): id is string => !!id),
          })),
        );

        for (const req of sales) {
          const variant = saleVariantMap.get(req.variantId);
          if (!variant)
            throw new NotFoundException(`Variant not found: ${req.variantId}`);
          if (!variant.isActive)
            throw new BadRequestException(
              `Variant is inactive: ${variant.name}`,
            );

          const unitPrice = toDecimal(req.unitPrice ?? variant.price);
          const lineGross = multiplyDecimals(unitPrice, req.quantity);
          const lineDiscount = sumDecimals(
            ...(req.discounts?.map((d) => d.amount) ?? []),
          );
          const postDiscount = lineGross.sub(lineDiscount);
          if (postDiscount.lt(0))
            throw new BadRequestException(
              `Line discount exceeds line total for ${variant.name}`,
            );

          const taxRate =
            variant.product.taxRate?.rate ??
            variant.product.category?.taxRate?.rate ??
            0;
          const lineTax = percentOf(postDiscount, taxRate);
          const lineTotal = postDiscount.add(lineTax);

          additionalChargeAmount = additionalChargeAmount.add(lineTotal);

          saleItemsData.push({
            product: { connect: { id: variant.productId } },
            variant: { connect: { id: variant.id } },
            quantity: req.quantity,
            unitPrice,
            unitCostSnapshot: variant.cost,
            discountAmount: lineDiscount,
            taxAmount: lineTax,
            subtotal: postDiscount,
            total: lineTotal,
            productNameSnapshot: variant.product.name,
            variantNameSnapshot: variant.name,
            variantSkuSnapshot: variant.sku,
            variantBarcodeSnapshot: variant.barcode,
            ...(req.discounts && req.discounts.length > 0
              ? {
                  itemDiscounts: {
                    create: req.discounts.map((d) => ({
                      discountId: d.discountId,
                      description: d.description,
                      amount: d.amount,
                    })),
                  },
                }
              : {}),
          });
        }

        const netAmount = additionalChargeAmount.sub(refundAmount);
        const type: OrderAdjustmentType =
          refundAmount.gt(0) && additionalChargeAmount.gt(0)
            ? OrderAdjustmentType.EXCHANGE
            : refundAmount.gt(0)
              ? OrderAdjustmentType.RETURN
              : OrderAdjustmentType.SALE_ADJUSTMENT;

        const adjustment = await tx.orderAdjustment.create({
          data: {
            originalOrder: { connect: { id: order.id } },
            store: { connect: { id: order.storeId } },
            cashier: { connect: { id: cashierId } },
            // Credit the same salesperson as the original sale so refunds net
            // against their commissionable total.
            ...(order.salespersonId && {
              salesperson: { connect: { id: order.salespersonId } },
            }),
            type,
            paymentMethod: dto.paymentMethod,
            refundAmount,
            additionalChargeAmount,
            netAmount,
            amountPaid: dto.amountPaid,
            changeGiven: additionalChargeAmount.gt(0)
              ? dto.paymentMethod === PaymentMethod.CASH && dto.amountPaid
                ? toDecimal(dto.amountPaid).sub(additionalChargeAmount)
                : toDecimal(0)
              : null,
            notes: dto.notes?.trim(),
            returnItems: { create: returnItemsData },
            saleItems: { create: saleItemsData },
          },
          include: adjustmentInclude,
        });

        // Stock movements: returns restock (if requested), sales decrement
        for (const r of returnItemsData) {
          if ((r as any).restock === false) continue;
          const variantId = (r.variant as any).connect.id as string;
          const orderItem = order.items.find(
            (i) => i.id === ((r.orderItem as any).connect.id as string),
          )!;
          await this.inventory.adjustStock(
            {
              storeId: order.storeId,
              variantId,
              delta: r.quantity!,
              type: StockMovementType.RETURN_IN,
              unitCost: orderItem.unitCostSnapshot,
              referenceType: 'ORDER_ADJUSTMENT',
              referenceId: adjustment.id,
              userId: cashierId,
            },
            tx,
          );
        }
        for (const s of saleItemsData) {
          const variantId = (s.variant as any).connect.id as string;
          const variant = saleVariantMap.get(variantId)!;
          await this.inventory.adjustStock(
            {
              storeId: order.storeId,
              variantId,
              delta: -s.quantity!,
              type: StockMovementType.SALE,
              unitCost: variant.cost,
              referenceType: 'ORDER_ADJUSTMENT',
              referenceId: adjustment.id,
              userId: cashierId,
            },
            tx,
          );
        }

        // Increment discount usage counts for linked discounts on new sale items.
        const linkedSaleDiscountIds = new Set<string>();
        for (const s of sales)
          for (const d of s.discounts ?? [])
            if (d.discountId) linkedSaleDiscountIds.add(d.discountId);
        if (linkedSaleDiscountIds.size > 0) {
          await tx.discount.updateMany({
            where: { id: { in: [...linkedSaleDiscountIds] } },
            data: { usageCount: { increment: 1 } },
          });
        }

        // Update Order.refundedTotal and status
        const newRefunded = toDecimal(order.refundedTotal).add(refundAmount);
        const fullyRefunded = newRefunded.gte(order.grandTotal);
        await tx.order.update({
          where: { id: order.id },
          data: {
            refundedTotal: newRefunded,
            status: fullyRefunded
              ? OrderStatus.REFUNDED
              : refundAmount.gt(0)
                ? OrderStatus.PARTIALLY_REFUNDED
                : order.status,
          },
        });

        return adjustment;
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async voidOrder(id: string, user: AuthUser) {
    const userId = user.id;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id },
          include: { items: true },
        });
        if (!order) throw new NotFoundException('Order not found');
        assertStoreAccess(user, order.storeId);
        if (order.status === OrderStatus.CANCELLED)
          throw new BadRequestException('Order already cancelled');

        const wasCompleted =
          order.status === OrderStatus.COMPLETED ||
          order.status === OrderStatus.PARTIALLY_REFUNDED;

        if (wasCompleted) {
          const returnedMap = await this.getReturnedQuantityMap(order.id, tx);
          for (const item of order.items) {
            const alreadyReturned = returnedMap.get(item.id) ?? 0;
            const toRestore = item.quantity - alreadyReturned;
            if (toRestore > 0) {
              await this.inventory.adjustStock(
                {
                  storeId: order.storeId,
                  variantId: item.variantId,
                  delta: toRestore,
                  type: StockMovementType.RETURN_IN,
                  unitCost: item.unitCostSnapshot,
                  referenceType: 'ORDER_VOID',
                  referenceId: order.id,
                  userId,
                },
                tx,
              );
            }
          }
        }

        return await tx.order.update({
          where: { id },
          data: { status: OrderStatus.CANCELLED },
          include: orderInclude,
        });
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async receipt(id: string, user: AuthUser) {
    const order = await this.findOne(id, user);
    return {
      receiptNumber: order.receiptNumber,
      store: order.store,
      cashier: order.cashier,
      customer: order.customer,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        name: i.productNameSnapshot,
        variant: i.variantNameSnapshot,
        sku: i.variantSkuSnapshot,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount,
        taxAmount: i.taxAmount,
        total: i.total,
      })),
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      taxTotal: order.taxTotal,
      grandTotal: order.grandTotal,
      paymentMethod: order.paymentMethod,
      amountPaid: order.amountPaid,
      changeGiven: order.changeGiven,
      currency: order.currency,
    };
  }

  private async getReturnedQuantityMap(
    orderId: string,
    client: Tx | PrismaService = this.prisma,
  ) {
    const rows = await client.orderAdjustmentReturnItem.findMany({
      where: {
        adjustment: { originalOrderId: orderId, status: 'COMPLETED' },
      },
      select: { orderItemId: true, quantity: true },
    });
    return rows.reduce((acc, r) => {
      acc.set(r.orderItemId, (acc.get(r.orderItemId) ?? 0) + r.quantity);
      return acc;
    }, new Map<string, number>());
  }
}
