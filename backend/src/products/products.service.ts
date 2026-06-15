import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductDto,
  CreateProductVariantDto,
} from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto, UpdateVariantDto } from './dto/upsert-variant.dto';
import { formatSkuSequence, sanitizeSkuPart } from '../shared/utils/sku.util';
import { randomEan13 } from '../shared/utils/barcode.util';

type NormalizedVariant = {
  id?: string;
  name?: string;
  attributeValueIds: string[];
  sku?: string;
  barcode: string;
  price: number;
  cost: number;
  isActive: boolean;
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(private prisma: PrismaService) {}

  private async generateProductSku(categoryName: string, productName: string) {
    const categoryCode = sanitizeSkuPart(categoryName, 5, 'GEN');
    const productCode = sanitizeSkuPart(productName, 6, 'ITEM');
    const prefix = `${categoryCode}-${productCode}-`;
    const existing = await this.prisma.product.findMany({
      where: { sku: { startsWith: prefix } },
      select: { sku: true },
      orderBy: { sku: 'desc' },
      take: 1,
    });
    const next = existing.length
      ? Number(existing[0].sku.split('-').at(-1) || 0) + 1
      : 1;
    return `${prefix}${formatSkuSequence(next)}`;
  }

  private async generateVariantSku(
    productSku: string,
    variantName: string,
    reservedSkus = new Set<string>(),
  ) {
    const variantCode = sanitizeSkuPart(variantName, 8, 'VAR');
    const prefix = `${productSku}-${variantCode}-`;
    const existing = await this.prisma.productVariant.findMany({
      where: { sku: { startsWith: prefix } },
      select: { sku: true },
      orderBy: { sku: 'desc' },
    });
    let next = existing.length
      ? Number(existing[0].sku.split('-').at(-1) || 0) + 1
      : 1;
    let candidate = `${prefix}${formatSkuSequence(next)}`;
    while (reservedSkus.has(candidate)) {
      next += 1;
      candidate = `${prefix}${formatSkuSequence(next)}`;
    }
    reservedSkus.add(candidate);
    return candidate;
  }

  /**
   * Fetches the given attribute values, validates they're active and from
   * distinct attributes, returns them in display order
   * (attribute.position → value.position).
   */
  private async resolveAttributeValues(ids: string[]) {
    if (!ids.length) return [];
    const values = await this.prisma.attributeValue.findMany({
      where: { id: { in: ids } },
      include: { attribute: true },
    });
    if (values.length !== ids.length)
      throw new BadRequestException('One or more attribute values not found');
    const inactive = values.find((v) => !v.isActive || !v.attribute.isActive);
    if (inactive)
      throw new BadRequestException(
        `Attribute value is inactive: ${inactive.attribute.name}=${inactive.value}`,
      );
    const seenAttributes = new Set<string>();
    for (const v of values) {
      if (seenAttributes.has(v.attributeId))
        throw new BadRequestException(
          `Multiple values for the same attribute (${v.attribute.name})`,
        );
      seenAttributes.add(v.attributeId);
    }
    return values.sort((a, b) => {
      if (a.attribute.position !== b.attribute.position)
        return a.attribute.position - b.attribute.position;
      return a.position - b.position;
    });
  }

  private composeVariantName(
    values: Awaited<ReturnType<ProductsService['resolveAttributeValues']>>,
    fallback: string,
  ) {
    if (!values.length) return fallback;
    return values.map((v) => v.value).join(' / ');
  }

  private normalizeVariantInput(
    variants: CreateProductVariantDto[],
    type: ProductType,
  ): NormalizedVariant[] {
    if (!variants.length)
      throw new BadRequestException('At least one variant is required');
    if (type === ProductType.SIMPLE && variants.length !== 1)
      throw new BadRequestException(
        'SIMPLE products must have exactly one variant',
      );

    const seenBarcodes = new Set<string>();
    const seenSignatures = new Set<string>();
    return variants.map((v) => {
      const barcode = v.barcode.trim();
      if (!barcode)
        throw new BadRequestException('Variant barcode cannot be empty');
      if (seenBarcodes.has(barcode.toLowerCase()))
        throw new BadRequestException(
          `Duplicate variant barcode: ${v.barcode}`,
        );
      seenBarcodes.add(barcode.toLowerCase());

      const attributeValueIds = v.attributeValueIds ?? [];
      if (type === ProductType.SIMPLE && attributeValueIds.length)
        throw new BadRequestException(
          'SIMPLE products cannot have attribute values on their variant',
        );
      if (type === ProductType.VARIABLE && attributeValueIds.length === 0)
        throw new BadRequestException(
          'VARIABLE products require at least one attribute value per variant',
        );

      const sig =
        [...attributeValueIds].sort().join('|') || v.name?.trim() || '';
      if (sig && seenSignatures.has(sig))
        throw new BadRequestException(
          'Duplicate variant (same attribute values or same name)',
        );
      if (sig) seenSignatures.add(sig);

      return {
        id: v.id,
        name: v.name?.trim() || undefined,
        attributeValueIds,
        sku: v.sku?.trim() || undefined,
        barcode,
        price: v.price,
        cost: v.cost,
        isActive: v.isActive ?? true,
      };
    });
  }

  private async ensureBarcodesAvailable(
    variants: Array<{ id?: string; barcode: string }>,
    productId?: string,
  ) {
    const barcodes = [...new Set(variants.map((v) => v.barcode))];
    if (!barcodes.length) return;
    const existing = await this.prisma.productVariant.findMany({
      where: { barcode: { in: barcodes } },
      select: { id: true, barcode: true, productId: true },
    });
    const conflict = existing.find(
      (e) =>
        (!productId || e.productId !== productId) &&
        !variants.some((v) => v.id === e.id),
    );
    if (conflict)
      throw new BadRequestException(
        `Variant barcode already exists: ${conflict.barcode}`,
      );
  }

  /**
   * Generate `count` unique EAN-13 barcodes that are not already used by any
   * variant. Used by the create/edit forms to auto-assign barcodes before the
   * product is persisted.
   */
  async generateBarcodes(count: number): Promise<string[]> {
    const target = Math.min(Math.max(Math.floor(count) || 1, 1), 200);
    const result = new Set<string>();
    let guard = 0;
    while (result.size < target && guard < 50) {
      guard++;
      const needed = target - result.size;
      // Over-generate a little to reduce round-trips when collisions occur.
      const candidates = new Set<string>();
      while (candidates.size < needed) candidates.add(randomEan13());
      const candidateList = [...candidates].filter((c) => !result.has(c));
      const taken = await this.prisma.productVariant.findMany({
        where: { barcode: { in: candidateList } },
        select: { barcode: true },
      });
      const takenSet = new Set(taken.map((t) => t.barcode));
      for (const c of candidateList) {
        if (!takenSet.has(c)) result.add(c);
        if (result.size >= target) break;
      }
    }
    return [...result];
  }

  private readonly include = {
    category: { select: { id: true, name: true, code: true } },
    brand: { select: { id: true, name: true } },
    taxRate: { select: { id: true, name: true, rate: true } },
    variants: {
      orderBy: [{ isActive: 'desc' as const }, { createdAt: 'asc' as const }],
      include: {
        attributeValues: {
          include: {
            attributeValue: { include: { attribute: true } },
          },
        },
      },
    },
  };

  async create(dto: CreateProductDto) {
    try {
      const name = dto.name.trim();
      const type = dto.type ?? ProductType.SIMPLE;
      if (!dto.categoryId)
        throw new BadRequestException('Category is required to generate SKU');

      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new BadRequestException('Category not found');
      if (dto.brandId)
        await this.ensure('brand', dto.brandId, 'Brand not found');
      if (dto.taxRateId)
        await this.ensure('taxRate', dto.taxRateId, 'Tax rate not found');

      const normalized = this.normalizeVariantInput(dto.variants, type);
      await this.ensureBarcodesAvailable(normalized);

      // Resolve attribute values and compose names up-front
      const variantPreps = await Promise.all(
        normalized.map(async (v) => {
          const values = await this.resolveAttributeValues(v.attributeValueIds);
          const composedName = this.composeVariantName(values, name);
          return {
            v,
            values,
            name: v.name ?? composedName,
          };
        }),
      );

      // Enforce uniqueness of computed variant names within this product
      const nameSet = new Set<string>();
      for (const p of variantPreps) {
        const key = p.name.toLowerCase();
        if (nameSet.has(key))
          throw new BadRequestException(
            `Duplicate variant name on product: ${p.name}`,
          );
        nameSet.add(key);
      }

      const sku = await this.generateProductSku(category.name, name);
      const reservedSkus = new Set<string>();

      return this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            name,
            sku,
            type,
            description: dto.description?.trim() || null,
            categoryId: dto.categoryId,
            brandId: dto.brandId,
            taxRateId: dto.taxRateId,
            imageUrl: dto.imageUrl,
          },
        });

        for (const p of variantPreps) {
          const variantSku =
            p.v.sku ||
            (await this.generateVariantSku(sku, p.name, reservedSkus));
          await tx.productVariant.create({
            data: {
              productId: product.id,
              name: p.name,
              sku: variantSku,
              barcode: p.v.barcode,
              price: p.v.price,
              cost: p.v.cost,
              isActive: p.v.isActive,
              attributeValues: p.values.length
                ? {
                    create: p.values.map((val) => ({
                      attributeValueId: val.id,
                    })),
                  }
                : undefined,
            },
          });
        }

        return tx.product.findUnique({
          where: { id: product.id },
          include: this.include,
        });
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    opts: {
      includeArchived?: boolean;
      search?: string;
      type?: string;
      categoryIds?: string[];
      brandId?: string;
    } = {},
  ) {
    try {
      const skip = (page - 1) * limit;
      // Archive sets both `archivedAt` and `isActive = false`, so `isActive: true`
      // is sufficient to exclude archived rows. Filtering on `archivedAt: null`
      // would also exclude products that were archived and later reactivated,
      // since `archivedAt` is never cleared.
      const where: Prisma.ProductWhereInput = {
        ...(opts.includeArchived ? {} : { isActive: true }),
      };

      const search = opts.search?.trim();
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          {
            variants: {
              some: {
                OR: [
                  { sku: { contains: search, mode: 'insensitive' } },
                  { barcode: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
        ];
      }

      if (
        opts.type &&
        (opts.type === ProductType.SIMPLE || opts.type === ProductType.VARIABLE)
      ) {
        where.type = opts.type;
      }
      if (opts.categoryIds && opts.categoryIds.length > 0) {
        where.categoryId =
          opts.categoryIds.length === 1
            ? opts.categoryIds[0]
            : { in: opts.categoryIds };
      }
      if (opts.brandId) where.brandId = opts.brandId;
      const [items, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: this.include,
        }),
        this.prisma.product.count({ where }),
      ]);
      return {
        data: items,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.include,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findByBarcode(barcode: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { barcode },
      include: { product: { include: this.include } },
    });
    if (!variant)
      throw new NotFoundException('Product variant not found for barcode');
    return { product: variant.product, matchedVariant: variant };
  }

  async update(id: string, dto: UpdateProductDto) {
    try {
      const existing = await this.findOne(id);
      if (dto.categoryId)
        await this.ensure('category', dto.categoryId, 'Category not found');
      if (dto.brandId)
        await this.ensure('brand', dto.brandId, 'Brand not found');
      if (dto.taxRateId)
        await this.ensure('taxRate', dto.taxRateId, 'Tax rate not found');

      // type cannot change post-create (would invalidate variants assumptions)
      if (dto.type && dto.type !== existing.type)
        throw new BadRequestException('Product type cannot be changed');

      const normalized = dto.variants
        ? this.normalizeVariantInput(dto.variants, existing.type)
        : null;
      if (normalized) await this.ensureBarcodesAvailable(normalized, id);

      const deactivateIds = new Set(dto.deactivateVariantIds ?? []);
      const existingIds = new Set(existing.variants.map((v) => v.id));
      for (const vid of deactivateIds) {
        if (!existingIds.has(vid))
          throw new BadRequestException(`Variant not found: ${vid}`);
      }

      return await this.prisma.$transaction(async (tx) => {
        if (normalized) {
          const reservedSkus = new Set<string>();
          for (const v of normalized) {
            const values = await this.resolveAttributeValues(
              v.attributeValueIds,
            );
            const composed = this.composeVariantName(values, existing.name);
            const finalName = v.name ?? composed;

            const incomingId = v.id && existingIds.has(v.id) ? v.id : undefined;
            const sku =
              v.sku ||
              (incomingId
                ? existing.variants.find((e) => e.id === incomingId)!.sku
                : await this.generateVariantSku(
                    existing.sku,
                    finalName,
                    reservedSkus,
                  ));
            reservedSkus.add(sku);

            if (incomingId) {
              await tx.productVariant.update({
                where: { id: incomingId },
                data: {
                  name: finalName,
                  sku,
                  barcode: v.barcode,
                  price: v.price,
                  cost: v.cost,
                  isActive: v.isActive,
                },
              });
              await tx.variantAttributeValue.deleteMany({
                where: { variantId: incomingId },
              });
              if (values.length) {
                await tx.variantAttributeValue.createMany({
                  data: values.map((val) => ({
                    variantId: incomingId,
                    attributeValueId: val.id,
                  })),
                });
              }
            } else {
              await tx.productVariant.create({
                data: {
                  productId: id,
                  name: finalName,
                  sku,
                  barcode: v.barcode,
                  price: v.price,
                  cost: v.cost,
                  isActive: v.isActive,
                  attributeValues: values.length
                    ? {
                        create: values.map((val) => ({
                          attributeValueId: val.id,
                        })),
                      }
                    : undefined,
                },
              });
            }
          }
        }

        if (deactivateIds.size > 0) {
          await tx.productVariant.updateMany({
            where: { id: { in: [...deactivateIds] }, productId: id },
            data: { isActive: false },
          });
        }

        await tx.product.update({
          where: { id },
          data: {
            ...(dto.name !== undefined && { name: dto.name.trim() }),
            ...(dto.description !== undefined && {
              description: dto.description?.trim() || null,
            }),
            ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
            ...(dto.brandId !== undefined && { brandId: dto.brandId }),
            ...(dto.taxRateId !== undefined && { taxRateId: dto.taxRateId }),
            ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
            ...(dto.isActive !== undefined && {
              isActive: dto.isActive,
              // Reactivating an archived product un-archives it.
              ...(dto.isActive === true && { archivedAt: null }),
            }),
          },
        });

        return tx.product.findUnique({
          where: { id },
          include: this.include,
        });
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async archive(id: string) {
    await this.findOne(id);
    return await this.prisma.product.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
      include: this.include,
    });
  }

  async addVariant(productId: string, dto: CreateVariantDto) {
    try {
      const product = await this.findOne(productId);
      if (product.type === ProductType.SIMPLE)
        throw new BadRequestException(
          'Cannot add variants to a SIMPLE product',
        );
      await this.ensureBarcodesAvailable([{ barcode: dto.barcode.trim() }]);

      const attributeValueIds = dto.attributeValueIds ?? [];
      if (!attributeValueIds.length)
        throw new BadRequestException(
          'VARIABLE product variants require attribute values',
        );

      const values = await this.resolveAttributeValues(attributeValueIds);
      const finalName =
        dto.name?.trim() || this.composeVariantName(values, product.name);

      const nameTaken = product.variants.some(
        (v) => v.name.toLowerCase() === finalName.toLowerCase(),
      );
      if (nameTaken)
        throw new BadRequestException('Variant name already exists on product');

      const sku =
        dto.sku?.trim() ||
        (await this.generateVariantSku(product.sku, finalName));

      return await this.prisma.productVariant.create({
        data: {
          productId,
          name: finalName,
          sku,
          barcode: dto.barcode.trim(),
          price: dto.price,
          cost: dto.cost,
          isActive: dto.isActive ?? true,
          attributeValues: {
            create: values.map((val) => ({ attributeValueId: val.id })),
          },
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateVariant(variantId: string, dto: UpdateVariantDto) {
    try {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });
      if (!variant) throw new NotFoundException('Variant not found');
      if (dto.barcode && dto.barcode.trim() !== variant.barcode)
        await this.ensureBarcodesAvailable(
          [{ id: variantId, barcode: dto.barcode.trim() }],
          variant.productId,
        );

      let finalName: string | undefined;
      let values: Awaited<
        ReturnType<ProductsService['resolveAttributeValues']>
      > | null = null;
      if (dto.attributeValueIds !== undefined) {
        if (
          variant.product.type === ProductType.SIMPLE &&
          dto.attributeValueIds.length
        )
          throw new BadRequestException(
            'SIMPLE product variants cannot carry attribute values',
          );
        if (
          variant.product.type === ProductType.VARIABLE &&
          dto.attributeValueIds.length === 0
        )
          throw new BadRequestException(
            'VARIABLE product variants require attribute values',
          );
        values = await this.resolveAttributeValues(dto.attributeValueIds);
        finalName =
          dto.name?.trim() ??
          this.composeVariantName(values, variant.product.name);
      } else if (dto.name !== undefined) {
        finalName = dto.name.trim();
      }

      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.productVariant.update({
          where: { id: variantId },
          data: {
            ...(finalName !== undefined && { name: finalName }),
            ...(dto.sku !== undefined && { sku: dto.sku.trim() }),
            ...(dto.barcode !== undefined && { barcode: dto.barcode.trim() }),
            ...(dto.price !== undefined && { price: dto.price }),
            ...(dto.cost !== undefined && { cost: dto.cost }),
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          },
        });
        if (values !== null) {
          await tx.variantAttributeValue.deleteMany({
            where: { variantId },
          });
          if (values.length) {
            await tx.variantAttributeValue.createMany({
              data: values.map((val) => ({
                variantId,
                attributeValueId: val.id,
              })),
            });
          }
        }
        return updated;
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deactivateVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            type: true,
            variants: { select: { id: true, isActive: true } },
          },
        },
      },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    if (variant.product.type === ProductType.SIMPLE)
      throw new BadRequestException(
        'Cannot deactivate the sole variant of a SIMPLE product. Archive the product instead.',
      );
    return await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });
  }

  private async ensure(
    table: 'category' | 'brand' | 'taxRate',
    id: string,
    msg: string,
  ) {
    const exists = await (this.prisma as any)[table].findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException(msg);
  }
}
