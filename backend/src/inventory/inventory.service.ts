import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto, RecordCountDto } from './dto/adjust-stock.dto';
import { SetReorderDto } from './dto/set-reorder.dto';

type Tx = Prisma.TransactionClient;

export interface AdjustStockInput {
  storeId: string;
  variantId: string;
  delta: number; // signed
  type: StockMovementType;
  unitCost?: number | Prisma.Decimal;
  referenceType?: string;
  referenceId?: string;
  userId?: string;
  notes?: string;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * Atomically adjusts InventoryLevel and writes a StockMovement.
   * Pass `tx` when calling from another service's transaction.
   */
  async adjustStock(input: AdjustStockInput, tx?: Tx) {
    const client = tx ?? this.prisma;
    const { storeId, variantId, delta, type } = input;
    if (delta === 0)
      throw new BadRequestException('Stock delta cannot be zero');

    const variant = await client.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true },
    });
    if (!variant) throw new BadRequestException('Variant does not exist');
    const store = await client.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });
    if (!store) throw new BadRequestException('Store does not exist');

    const level = await client.inventoryLevel.upsert({
      where: { storeId_variantId: { storeId, variantId } },
      create: { storeId, variantId, quantity: 0 },
      update: {},
    });

    const newQty = level.quantity + delta;
    if (newQty < 0)
      throw new BadRequestException(
        `Insufficient stock: available ${level.quantity}, requested ${-delta}`,
      );

    await client.inventoryLevel.update({
      where: { storeId_variantId: { storeId, variantId } },
      data: { quantity: newQty },
    });

    return await client.stockMovement.create({
      data: {
        storeId,
        variantId,
        type,
        quantity: delta,
        unitCost: input.unitCost as any,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        userId: input.userId,
        notes: input.notes,
      },
    });
  }

  async getLevel(storeId: string, variantId: string) {
    const level = await this.prisma.inventoryLevel.findUnique({
      where: { storeId_variantId: { storeId, variantId } },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!level) return { storeId, variantId, quantity: 0, reserved: 0 };
    return level;
  }

  /**
   * Sets the reorder point (low-stock threshold) and optional reorder quantity
   * for a variant at a store. Upserts the level so a threshold can be configured
   * before any stock has moved.
   */
  async setReorder(dto: SetReorderDto) {
    const { storeId, variantId, reorderPoint } = dto;
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true },
    });
    if (!variant) throw new BadRequestException('Variant does not exist');
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });
    if (!store) throw new BadRequestException('Store does not exist');

    return this.prisma.inventoryLevel.upsert({
      where: { storeId_variantId: { storeId, variantId } },
      create: {
        storeId,
        variantId,
        quantity: 0,
        reorderPoint,
        reorderQty: dto.reorderQty ?? 0,
      },
      update: {
        reorderPoint,
        ...(dto.reorderQty !== undefined ? { reorderQty: dto.reorderQty } : {}),
      },
    });
  }

  async listLevels(
    opts: {
      storeId?: string;
      search?: string;
      categoryIds?: string[];
      lowStockOnly?: boolean;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 50;
    const skip = (page - 1) * limit;
    const where: Prisma.InventoryLevelWhereInput = {};
    if (opts.storeId) where.storeId = opts.storeId;
    // Both `search` and `categoryIds` constrain the related variant (category
    // lives on the variant's product), so build one variant filter and AND the
    // constraints together.
    const variantWhere: Prisma.ProductVariantWhereInput = {};
    const search = opts.search?.trim();
    if (search) {
      variantWhere.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        {
          product: {
            is: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }
    if (opts.categoryIds?.length) {
      variantWhere.product = { is: { categoryId: { in: opts.categoryIds } } };
    }
    if (Object.keys(variantWhere).length) {
      where.variant = variantWhere;
    }
    if (opts.lowStockOnly) {
      // Postgres: quantity <= reorderPoint. Use raw filter via custom query.
      where.quantity = {
        lte: this.prisma.inventoryLevel.fields.reorderPoint,
      } as any;
    }
    const [items, total] = await Promise.all([
      this.prisma.inventoryLevel.findMany({
        where,
        skip,
        take: limit,
        include: {
          variant: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
          store: { select: { id: true, name: true, code: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.inventoryLevel.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async manualAdjust(dto: AdjustStockDto, userId?: string) {
    try {
      return await this.prisma.$transaction((tx) =>
        this.adjustStock(
          {
            storeId: dto.storeId,
            variantId: dto.variantId,
            delta: dto.delta,
            type: StockMovementType.ADJUSTMENT,
            unitCost: dto.unitCost,
            referenceType: 'ADJUSTMENT',
            notes: dto.notes,
            userId,
          },
          tx,
        ),
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async recordCount(dto: RecordCountDto, userId?: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const level = await tx.inventoryLevel.upsert({
          where: {
            storeId_variantId: {
              storeId: dto.storeId,
              variantId: dto.variantId,
            },
          },
          create: {
            storeId: dto.storeId,
            variantId: dto.variantId,
            quantity: 0,
          },
          update: {},
        });
        const delta = dto.countedQuantity - level.quantity;
        if (delta === 0) return level;
        return await this.adjustStock(
          {
            storeId: dto.storeId,
            variantId: dto.variantId,
            delta,
            type: StockMovementType.COUNT,
            referenceType: 'COUNT',
            notes: dto.notes,
            userId,
          },
          tx,
        );
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async listMovements(
    opts: {
      storeId?: string;
      variantId?: string;
      type?: StockMovementType;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 50;
    const skip = (page - 1) * limit;
    const where: Prisma.StockMovementWhereInput = {};
    if (opts.storeId) where.storeId = opts.storeId;
    if (opts.variantId) where.variantId = opts.variantId;
    if (opts.type) where.type = opts.type;
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from);
      if (opts.to) where.createdAt.lte = new Date(opts.to);
    }
    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variant: {
            select: {
              id: true,
              name: true,
              sku: true,
              product: { select: { id: true, name: true } },
            },
          },
          store: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, email: true, fullName: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMovement(id: string) {
    const m = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            product: { select: { id: true, name: true } },
          },
        },
        store: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, email: true, fullName: true } },
      },
    });
    if (!m) throw new NotFoundException('Stock movement not found');
    return m;
  }
}
