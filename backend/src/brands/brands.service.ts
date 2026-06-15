import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    try {
      const name = dto.name.trim();
      const existing = await this.prisma.brand.findUnique({ where: { name } });
      if (existing) throw new BadRequestException('Brand name already exists');
      return await this.prisma.brand.create({
        data: { name, isActive: dto.isActive ?? true },
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
    try {
      const skip = (page - 1) * limit;
      const where = opts.includeArchived ? {} : { isActive: true };
      const [items, total] = await Promise.all([
        this.prisma.brand.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        this.prisma.brand.count({ where }),
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
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    try {
      await this.findOne(id);
      if (dto.name) {
        const conflict = await this.prisma.brand.findUnique({
          where: { name: dto.name.trim() },
          select: { id: true },
        });
        if (conflict && conflict.id !== id)
          throw new BadRequestException('Brand name already exists');
      }
      return await this.prisma.brand.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async archive(id: string) {
    await this.findOne(id);
    return await this.prisma.brand.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
