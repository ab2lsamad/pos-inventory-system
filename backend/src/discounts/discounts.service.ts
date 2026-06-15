import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DiscountScope, DiscountType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ValidateDiscountDto } from './dto/validate-discount.dto';
import { percentOf, toDecimal } from '../shared/utils/decimal.util';

// Targets are exposed with enough variant/product context for the admin UI to
// render chips and the POS terminal to filter by the line's variant.
const discountInclude = Prisma.validator<Prisma.DiscountInclude>()({
  targetVariants: {
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
export class DiscountsService {
  private readonly logger = new Logger(DiscountsService.name);
  constructor(private prisma: PrismaService) {}

  // Validate that the supplied variant IDs are appropriate for the scope and
  // all exist. Returns the de-duplicated list to persist.
  private async resolveTargetVariantIds(
    scope: DiscountScope,
    variantIds: string[] | undefined,
  ): Promise<string[]> {
    const ids = [...new Set(variantIds ?? [])];
    if (ids.length === 0) return [];
    if (scope !== DiscountScope.LINE_ITEM)
      throw new BadRequestException(
        'Only LINE_ITEM discounts can target specific variants',
      );
    const found = await this.prisma.productVariant.count({
      where: { id: { in: ids } },
    });
    if (found !== ids.length)
      throw new BadRequestException('One or more target variants do not exist');
    return ids;
  }

  async create(dto: CreateDiscountDto) {
    try {
      if (dto.code) {
        const exists = await this.prisma.discount.findUnique({
          where: { code: dto.code.toUpperCase() },
        });
        if (exists)
          throw new BadRequestException('Discount code already exists');
      }
      const targetVariantIds = await this.resolveTargetVariantIds(
        dto.scope,
        dto.variantIds,
      );
      return await this.prisma.discount.create({
        data: {
          name: dto.name.trim(),
          code: dto.code?.toUpperCase(),
          type: dto.type,
          scope: dto.scope,
          value: dto.value,
          minSubtotal: dto.minSubtotal,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          usageLimit: dto.usageLimit,
          isActive: dto.isActive ?? true,
          ...(targetVariantIds.length > 0
            ? {
                targetVariants: {
                  create: targetVariantIds.map((variantId) => ({
                    variant: { connect: { id: variantId } },
                  })),
                },
              }
            : {}),
        },
        include: discountInclude,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    opts: { includeArchived?: boolean } = {},
  ) {
    const skip = (page - 1) * limit;
    const where = opts.includeArchived ? {} : { isActive: true };
    const [items, total] = await Promise.all([
      this.prisma.discount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: discountInclude,
      }),
      this.prisma.discount.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const d = await this.prisma.discount.findUnique({
      where: { id },
      include: discountInclude,
    });
    if (!d) throw new NotFoundException('Discount not found');
    return d;
  }

  async update(id: string, dto: UpdateDiscountDto) {
    try {
      const existing = await this.findOne(id);
      if (dto.code) {
        const conflict = await this.prisma.discount.findUnique({
          where: { code: dto.code.toUpperCase() },
          select: { id: true },
        });
        if (conflict && conflict.id !== id)
          throw new BadRequestException('Discount code already exists');
      }
      const data: Prisma.DiscountUpdateInput = {};
      if (dto.name !== undefined) data.name = dto.name.trim();
      if (dto.code !== undefined) data.code = dto.code?.toUpperCase();
      if (dto.type !== undefined) data.type = dto.type;
      if (dto.scope !== undefined) data.scope = dto.scope;
      if (dto.value !== undefined) data.value = dto.value;
      if (dto.minSubtotal !== undefined) data.minSubtotal = dto.minSubtotal;
      if (dto.startsAt !== undefined)
        data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
      if (dto.endsAt !== undefined)
        data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
      if (dto.usageLimit !== undefined) data.usageLimit = dto.usageLimit;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;

      // Reconcile variant targeting. Reset the set when variantIds is supplied,
      // or when the scope changes away from LINE_ITEM (targets become invalid).
      const effectiveScope = dto.scope ?? existing.scope;
      if (effectiveScope !== DiscountScope.LINE_ITEM) {
        if (existing.targetVariants.length > 0)
          data.targetVariants = { deleteMany: {} };
      } else if (dto.variantIds !== undefined) {
        const targetVariantIds = await this.resolveTargetVariantIds(
          effectiveScope,
          dto.variantIds,
        );
        data.targetVariants = {
          deleteMany: {},
          create: targetVariantIds.map((variantId) => ({
            variant: { connect: { id: variantId } },
          })),
        };
      }

      return await this.prisma.discount.update({
        where: { id },
        data,
        include: discountInclude,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async validate(dto: ValidateDiscountDto) {
    const code = dto.code.toUpperCase().trim();
    const discount = await this.prisma.discount.findUnique({
      where: { code },
    });
    if (!discount || !discount.isActive)
      throw new BadRequestException('Invalid discount code');
    const now = new Date();
    if (discount.startsAt && discount.startsAt > now)
      throw new BadRequestException('Discount not yet active');
    if (discount.endsAt && discount.endsAt < now)
      throw new BadRequestException('Discount has expired');
    if (
      discount.usageLimit !== null &&
      discount.usageCount >= discount.usageLimit!
    )
      throw new BadRequestException('Discount usage limit reached');
    const subtotal = toDecimal(dto.subtotal);
    if (discount.minSubtotal && subtotal.lt(discount.minSubtotal))
      throw new BadRequestException(
        `Minimum subtotal of ${discount.minSubtotal.toString()} not met`,
      );

    const amount =
      discount.type === DiscountType.PERCENTAGE
        ? percentOf(subtotal, discount.value)
        : toDecimal(discount.value);

    const finalAmount = amount.gt(subtotal) ? subtotal : amount;
    return {
      discountId: discount.id,
      name: discount.name,
      type: discount.type,
      scope: discount.scope,
      value: discount.value,
      computedAmount: finalAmount.toNumber(),
    };
  }
}
