import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    try {
      const fullName = dto.fullName.trim();
      if (dto.phone) await this.assertUnique('phone', dto.phone);
      if (dto.email) await this.assertUnique('email', dto.email.toLowerCase());
      return await this.prisma.customer.create({
        data: {
          fullName,
          phone: dto.phone,
          email: dto.email?.toLowerCase(),
          notes: dto.notes,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findAll(
    opts: {
      page?: number;
      limit?: number;
      search?: string;
      includeInactive?: boolean;
    } = {},
  ) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 10;
    const skip = (page - 1) * limit;
    const where: Prisma.CustomerWhereInput = {};
    if (!opts.includeInactive) {
      where.isActive = true;
    }
    if (opts.search) {
      where.OR = [
        { fullName: { contains: opts.search, mode: 'insensitive' } },
        { phone: { contains: opts.search } },
        { email: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  async findByPhone(phone: string) {
    return this.prisma.customer.findUnique({ where: { phone } });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    try {
      await this.findOne(id);
      if (dto.phone) await this.assertUnique('phone', dto.phone, id);
      if (dto.email)
        await this.assertUnique('email', dto.email.toLowerCase(), id);
      return await this.prisma.customer.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined && { fullName: dto.fullName.trim() }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.email !== undefined && { email: dto.email?.toLowerCase() }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async assertUnique(
    field: 'phone' | 'email',
    value: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.customer.findUnique({
      where: { [field]: value } as any,
      select: { id: true },
    });
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException(`Customer ${field} already in use`);
    }
  }
}
