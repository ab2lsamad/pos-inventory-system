import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseOrderStatus, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import {
  multiplyDecimals,
  sumDecimals,
  toDecimal,
} from '../shared/utils/decimal.util';
import { recomputeWeightedAverageCost } from '../shared/utils/wac.util';
import { buildPoNumber } from '../shared/utils/sequence.util';
import {
  AuthUser,
  assertStoreAccess,
  resolveStoreScope,
} from '../shared/utils/store-scope.util';

const poInclude = Prisma.validator<Prisma.PurchaseOrderInclude>()({
  supplier: { select: { id: true, name: true } },
  store: { select: { id: true, name: true, code: true, currency: true } },
  createdBy: { select: { id: true, email: true, fullName: true } },
  items: {
    include: {
      variant: {
        select: {
          id: true,
          name: true,
          sku: true,
          product: { select: { id: true, name: true } },
        },
      },
    },
  },
});

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
  ) {}

  private async generatePoNumber(tx: Prisma.TransactionClient) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = await tx.purchaseOrder.count({
      where: { createdAt: { gte: start } },
    });
    return buildPoNumber(now, count + 1);
  }

  async create(dto: CreatePurchaseOrderDto, user: AuthUser) {
    const userId = user.id;
    // Non-admins can only raise POs for their own store.
    const scopedStoreId = resolveStoreScope(user, dto.storeId);
    if (!scopedStoreId) throw new BadRequestException('storeId is required');
    dto.storeId = scopedStoreId;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const supplier = await tx.supplier.findUnique({
          where: { id: dto.supplierId },
          select: { id: true },
        });
        if (!supplier) throw new BadRequestException('Supplier not found');
        const store = await tx.store.findUnique({
          where: { id: dto.storeId },
          select: { id: true, currency: true },
        });
        if (!store) throw new BadRequestException('Store not found');

        // Validate variants
        const variantIds = dto.items.map((i) => i.variantId);
        const variants = await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true },
        });
        if (variants.length !== new Set(variantIds).size)
          throw new BadRequestException('One or more variants not found');

        const subtotal = sumDecimals(
          ...dto.items.map((i) =>
            multiplyDecimals(i.unitCost, i.quantityOrdered),
          ),
        );
        const taxTotal = toDecimal(dto.taxTotal ?? 0);
        const shippingCost = toDecimal(dto.shippingCost ?? 0);
        const grandTotal = subtotal.add(taxTotal).add(shippingCost);

        const poNumber = await this.generatePoNumber(tx);

        return await tx.purchaseOrder.create({
          data: {
            poNumber,
            supplier: { connect: { id: dto.supplierId } },
            store: { connect: { id: dto.storeId } },
            status: PurchaseOrderStatus.DRAFT,
            expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
            subtotal,
            taxTotal,
            shippingCost,
            grandTotal,
            currency: store.currency,
            notes: dto.notes,
            createdBy: { connect: { id: userId } },
            items: {
              create: dto.items.map((i) => ({
                variantId: i.variantId,
                quantityOrdered: i.quantityOrdered,
                unitCost: i.unitCost,
                subtotal: multiplyDecimals(i.unitCost, i.quantityOrdered),
              })),
            },
          },
          include: poInclude,
        });
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
      supplierId?: string;
      status?: PurchaseOrderStatus;
    } = {},
  ) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 10;
    const skip = (page - 1) * limit;
    const where: Prisma.PurchaseOrderWhereInput = {};
    // Non-admins are restricted to their own store regardless of the query.
    const scopedStoreId = resolveStoreScope(user, opts.storeId);
    if (scopedStoreId) where.storeId = scopedStoreId;
    if (opts.supplierId) where.supplierId = opts.supplierId;
    if (opts.status) where.status = opts.status;
    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: poInclude,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: AuthUser) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: poInclude,
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    assertStoreAccess(user, po.storeId);
    return po;
  }

  async submit(id: string, user: AuthUser) {
    const po = await this.findOne(id, user);
    if (po.status !== PurchaseOrderStatus.DRAFT)
      throw new BadRequestException(
        'Only DRAFT purchase orders can be submitted',
      );
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.ORDERED },
      include: poInclude,
    });
  }

  async cancel(id: string, user: AuthUser) {
    const po = await this.findOne(id, user);
    if (
      po.status === PurchaseOrderStatus.RECEIVED ||
      po.status === PurchaseOrderStatus.CANCELLED
    )
      throw new BadRequestException(
        'Cannot cancel a received or already-cancelled PO',
      );
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CANCELLED },
      include: poInclude,
    });
  }

  async receive(id: string, dto: ReceivePurchaseOrderDto, user: AuthUser) {
    const userId = user.id;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.findUnique({
          where: { id },
          include: { items: true },
        });
        if (!po) throw new NotFoundException('Purchase order not found');
        assertStoreAccess(user, po.storeId);
        if (
          po.status === PurchaseOrderStatus.CANCELLED ||
          po.status === PurchaseOrderStatus.RECEIVED
        )
          throw new BadRequestException(
            'Cannot receive a cancelled or already fully received PO',
          );

        for (const incoming of dto.items) {
          const line = po.items.find((l) => l.id === incoming.itemId);
          if (!line)
            throw new BadRequestException(
              `PO item not found: ${incoming.itemId}`,
            );
          const newTotal = line.quantityReceived + incoming.quantityReceived;
          if (newTotal > line.quantityOrdered)
            throw new BadRequestException(
              `Receiving more than ordered for ${line.id}`,
            );
          if (incoming.quantityReceived <= 0) continue;

          await tx.purchaseOrderItem.update({
            where: { id: line.id },
            data: { quantityReceived: newTotal },
          });

          await recomputeWeightedAverageCost(tx, {
            variantId: line.variantId,
            quantityReceived: incoming.quantityReceived,
            unitCost: line.unitCost,
          });

          await this.inventory.adjustStock(
            {
              storeId: po.storeId,
              variantId: line.variantId,
              delta: incoming.quantityReceived,
              type: StockMovementType.PURCHASE,
              unitCost: line.unitCost,
              referenceType: 'PURCHASE_ORDER',
              referenceId: po.id,
              userId,
            },
            tx,
          );
        }

        // Recompute status
        const refreshedItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: po.id },
          select: { quantityOrdered: true, quantityReceived: true },
        });
        const allReceived = refreshedItems.every(
          (l) => l.quantityReceived >= l.quantityOrdered,
        );
        const anyReceived = refreshedItems.some((l) => l.quantityReceived > 0);
        const status = allReceived
          ? PurchaseOrderStatus.RECEIVED
          : anyReceived
            ? PurchaseOrderStatus.PARTIALLY_RECEIVED
            : po.status;

        return await tx.purchaseOrder.update({
          where: { id: po.id },
          data: {
            status,
            receivedAt: allReceived ? new Date() : po.receivedAt,
          },
          include: poInclude,
        });
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
