import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';

@Injectable()
export class TaxRatesService {
  private readonly logger = new Logger(TaxRatesService.name);
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTaxRateDto) {
    try {
      const name = dto.name.trim();
      const exists = await this.prisma.taxRate.findUnique({ where: { name } });
      if (exists) throw new BadRequestException('Tax rate name already exists');
      return await this.prisma.taxRate.create({
        data: {
          name,
          rate: dto.rate,
          isInclusive: dto.isInclusive ?? false,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    opts: { includeArchived?: boolean; search?: string } = {},
  ) {
    try {
      const skip = (page - 1) * limit;
      const search = opts.search?.trim();
      const where: Record<string, unknown> = opts.includeArchived
        ? {}
        : { isActive: true };
      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }
      const [items, total] = await Promise.all([
        this.prisma.taxRate.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        this.prisma.taxRate.count({ where }),
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
    const tax = await this.prisma.taxRate.findUnique({ where: { id } });
    if (!tax) throw new NotFoundException('Tax rate not found');
    return tax;
  }

  async update(id: string, dto: UpdateTaxRateDto) {
    try {
      await this.findOne(id);
      if (dto.name) {
        const conflict = await this.prisma.taxRate.findUnique({
          where: { name: dto.name.trim() },
          select: { id: true },
        });
        if (conflict && conflict.id !== id)
          throw new BadRequestException('Tax rate name already exists');
      }
      return await this.prisma.taxRate.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.rate !== undefined && { rate: dto.rate }),
          ...(dto.isInclusive !== undefined && {
            isInclusive: dto.isInclusive,
          }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
