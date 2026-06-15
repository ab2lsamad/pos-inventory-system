import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);
  constructor(private prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 10,
    opts: { includeArchived?: boolean } = {},
  ) {
    try {
      const skip = (page - 1) * limit;
      const where = opts.includeArchived ? {} : { isActive: true };
      const [items, total] = await Promise.all([
        this.prisma.store.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.store.count({ where }),
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

  async create(data: CreateStoreDto) {
    try {
      const code = data.code.trim().toUpperCase();
      const existing = await this.prisma.store.findUnique({ where: { code } });
      if (existing) throw new BadRequestException('Store code already exists');

      return await this.prisma.store.create({
        data: {
          name: data.name.trim(),
          code,
          location: data.location,
          phone: data.phone,
          currency: (data.currency ?? 'PKR').toUpperCase(),
          taxId: data.taxId,
          isActive: data.isActive ?? true,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const store = await this.prisma.store.findUnique({ where: { id } });
      if (!store) throw new NotFoundException('Store not found');
      return store;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async archive(id: string) {
    await this.findOne(id);
    return await this.prisma.store.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async update(id: string, data: UpdateStoreDto) {
    try {
      await this.findOne(id);

      if (data.code) {
        const code = data.code.trim().toUpperCase();
        const conflict = await this.prisma.store.findUnique({
          where: { code },
          select: { id: true },
        });
        if (conflict && conflict.id !== id) {
          throw new BadRequestException('Store code already exists');
        }
        data.code = code;
      }

      if (data.currency) data.currency = data.currency.toUpperCase();

      return await this.prisma.store.update({ where: { id }, data });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
