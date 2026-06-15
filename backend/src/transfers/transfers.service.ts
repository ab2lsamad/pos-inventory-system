import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementType, TransferStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  CreateTransferDto,
  ReceiveTransferDto,
} from './dto/create-transfer.dto';
import { buildTransferNumber } from '../shared/utils/sequence.util';
import {
  AuthUser,
  assertStoreAccess,
  assertStoreInvolved,
} from '../shared/utils/store-scope.util';

const transferInclude = Prisma.validator<Prisma.StockTransferInclude>()({
  fromStore: { select: { id: true, name: true, code: true } },
  toStore: { select: { id: true, name: true, code: true } },
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
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
  ) {}

  private async generateTransferNumber(tx: Prisma.TransactionClient) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = await tx.stockTransfer.count({
      where: { createdAt: { gte: start } },
    });
    return buildTransferNumber(now, count + 1);
  }

  async create(dto: CreateTransferDto, user: AuthUser) {
    const userId = user.id;
    try {
      if (dto.fromStoreId === dto.toStoreId)
        throw new BadRequestException('Source and destination must differ');
      // Non-admins can only originate transfers from their own store.
      assertStoreAccess(user, dto.fromStoreId);
      return await this.prisma.$transaction(async (tx) => {
        const [from, to] = await Promise.all([
          tx.store.findUnique({
            where: { id: dto.fromStoreId },
            select: { id: true },
          }),
          tx.store.findUnique({
            where: { id: dto.toStoreId },
            select: { id: true },
          }),
        ]);
        if (!from || !to) throw new BadRequestException('Store(s) not found');

        const variantIds = dto.items.map((i) => i.variantId);
        const variants = await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true },
        });
        if (variants.length !== new Set(variantIds).size)
          throw new BadRequestException('One or more variants not found');

        const transferNumber = await this.generateTransferNumber(tx);
        return await tx.stockTransfer.create({
          data: {
            transferNumber,
            fromStore: { connect: { id: dto.fromStoreId } },
            toStore: { connect: { id: dto.toStoreId } },
            status: TransferStatus.DRAFT,
            notes: dto.notes,
            createdBy: { connect: { id: userId } },
            items: {
              create: dto.items.map((i) => ({
                variantId: i.variantId,
                quantity: i.quantity,
              })),
            },
          },
          include: transferInclude,
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
      fromStoreId?: string;
      toStoreId?: string;
      status?: TransferStatus;
    } = {},
  ) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 10;
    const skip = (page - 1) * limit;
    const where: Prisma.StockTransferWhereInput = {};
    if (user.role === 'ADMIN') {
      // Admins may filter by either side freely.
      if (opts.fromStoreId) where.fromStoreId = opts.fromStoreId;
      if (opts.toStoreId) where.toStoreId = opts.toStoreId;
    } else if (user.storeId) {
      // Non-admins only see transfers their store participates in (in or out).
      where.OR = [{ fromStoreId: user.storeId }, { toStoreId: user.storeId }];
    }
    if (opts.status) where.status = opts.status;
    const [items, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: transferInclude,
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: AuthUser) {
    const t = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: transferInclude,
    });
    if (!t) throw new NotFoundException('Transfer not found');
    assertStoreInvolved(user, [t.fromStoreId, t.toStoreId]);
    return t;
  }

  async ship(id: string, user: AuthUser) {
    const userId = user.id;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const transfer = await tx.stockTransfer.findUnique({
          where: { id },
          include: { items: true },
        });
        if (!transfer) throw new NotFoundException('Transfer not found');
        // Only the source store (or an admin) may ship a transfer out.
        assertStoreAccess(user, transfer.fromStoreId);
        if (transfer.status !== TransferStatus.DRAFT)
          throw new BadRequestException('Only DRAFT transfers can be shipped');

        for (const item of transfer.items) {
          await this.inventory.adjustStock(
            {
              storeId: transfer.fromStoreId,
              variantId: item.variantId,
              delta: -item.quantity,
              type: StockMovementType.TRANSFER_OUT,
              referenceType: 'TRANSFER',
              referenceId: transfer.id,
              userId,
            },
            tx,
          );
        }
        return await tx.stockTransfer.update({
          where: { id },
          data: { status: TransferStatus.IN_TRANSIT, shippedAt: new Date() },
          include: transferInclude,
        });
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async receive(id: string, dto: ReceiveTransferDto, user: AuthUser) {
    const userId = user.id;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const transfer = await tx.stockTransfer.findUnique({
          where: { id },
          include: { items: true },
        });
        if (!transfer) throw new NotFoundException('Transfer not found');
        // Only the destination store (or an admin) may receive a transfer.
        assertStoreAccess(user, transfer.toStoreId);
        if (transfer.status !== TransferStatus.IN_TRANSIT)
          throw new BadRequestException(
            'Only IN_TRANSIT transfers can be received',
          );

        for (const incoming of dto.items) {
          const line = transfer.items.find((l) => l.id === incoming.itemId);
          if (!line)
            throw new BadRequestException(
              `Transfer item not found: ${incoming.itemId}`,
            );
          const newTotal = line.quantityReceived + incoming.quantityReceived;
          if (newTotal > line.quantity)
            throw new BadRequestException(
              `Receiving more than shipped for ${line.id}`,
            );
          if (incoming.quantityReceived <= 0) continue;

          await tx.stockTransferItem.update({
            where: { id: line.id },
            data: { quantityReceived: newTotal },
          });

          await this.inventory.adjustStock(
            {
              storeId: transfer.toStoreId,
              variantId: line.variantId,
              delta: incoming.quantityReceived,
              type: StockMovementType.TRANSFER_IN,
              referenceType: 'TRANSFER',
              referenceId: transfer.id,
              userId,
            },
            tx,
          );
        }

        const refreshed = await tx.stockTransferItem.findMany({
          where: { transferId: transfer.id },
          select: { quantity: true, quantityReceived: true },
        });
        const allReceived = refreshed.every(
          (l) => l.quantityReceived >= l.quantity,
        );
        return await tx.stockTransfer.update({
          where: { id: transfer.id },
          data: {
            status: allReceived ? TransferStatus.RECEIVED : transfer.status,
            receivedAt: allReceived ? new Date() : transfer.receivedAt,
          },
          include: transferInclude,
        });
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async cancel(id: string, user: AuthUser) {
    const t = await this.findOne(id, user);
    // Only the originating store (or an admin) may cancel a draft transfer.
    assertStoreAccess(user, t.fromStoreId);
    if (t.status !== TransferStatus.DRAFT)
      throw new BadRequestException('Only DRAFT transfers can be cancelled');
    return this.prisma.stockTransfer.update({
      where: { id },
      data: { status: TransferStatus.CANCELLED },
      include: transferInclude,
    });
  }
}
