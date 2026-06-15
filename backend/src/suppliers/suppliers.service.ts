import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import {
  UpdateSupplierProductDto,
  UpsertSupplierProductDto,
} from './dto/supplier-product.dto';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    try {
      return await this.prisma.supplier.create({
        data: {
          name: dto.name.trim(),
          contactPerson: dto.contactPerson,
          email: dto.email?.toLowerCase(),
          phone: dto.phone,
          address: dto.address,
          taxId: dto.taxId,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count(),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const s = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
                cost: true,
                product: { select: { id: true, name: true, sku: true } },
              },
            },
          },
        },
      },
    });
    if (!s) throw new NotFoundException('Supplier not found');
    return s;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.contactPerson !== undefined && {
          contactPerson: dto.contactPerson,
        }),
        ...(dto.email !== undefined && { email: dto.email?.toLowerCase() }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.taxId !== undefined && { taxId: dto.taxId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async addProduct(supplierId: string, dto: UpsertSupplierProductDto) {
    try {
      await this.findOne(supplierId);
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: dto.variantId },
        select: { id: true },
      });
      if (!variant) throw new BadRequestException('Variant not found');
      return await this.prisma.supplierProduct.create({
        data: {
          supplierId,
          variantId: dto.variantId,
          supplierSku: dto.supplierSku,
          costPrice: dto.costPrice,
          leadTimeDays: dto.leadTimeDays,
        },
        include: {
          variant: {
            select: {
              id: true,
              name: true,
              sku: true,
              cost: true,
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async listProducts(supplierId: string) {
    await this.findOne(supplierId);
    return this.prisma.supplierProduct.findMany({
      where: { supplierId },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            cost: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });
  }

  async updateProduct(
    supplierId: string,
    variantId: string,
    dto: UpdateSupplierProductDto,
  ) {
    const existing = await this.prisma.supplierProduct.findUnique({
      where: { supplierId_variantId: { supplierId, variantId } },
    });
    if (!existing)
      throw new NotFoundException('Supplier variant link not found');
    return this.prisma.supplierProduct.update({
      where: { supplierId_variantId: { supplierId, variantId } },
      data: {
        ...(dto.supplierSku !== undefined && { supplierSku: dto.supplierSku }),
        ...(dto.costPrice !== undefined && { costPrice: dto.costPrice }),
        ...(dto.leadTimeDays !== undefined && {
          leadTimeDays: dto.leadTimeDays,
        }),
      },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            cost: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });
  }

  async removeProduct(supplierId: string, variantId: string) {
    return this.prisma.supplierProduct.delete({
      where: { supplierId_variantId: { supplierId, variantId } },
    });
  }
}
