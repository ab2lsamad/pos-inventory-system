import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { AuthUser, resolveStoreScope } from '../shared/utils/store-scope.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  private readonly logger = new Logger(UsersService.name);
  private readonly userSelect: Prisma.UserSelect = {
    id: true,
    email: true,
    fullName: true,
    phone: true,
    role: true,
    storeId: true,
    isActive: true,
    baseSalary: true,
    commissionPercent: true,
    compensationStartDate: true,
    isCompensationEnabled: true,
    store: {
      select: { id: true, name: true, code: true, currency: true },
    },
    createdAt: true,
    updatedAt: true,
  };

  private buildCompensationData(
    input: Pick<
      CreateUserDto | UpdateUserDto,
      | 'baseSalary'
      | 'commissionPercent'
      | 'compensationStartDate'
      | 'isCompensationEnabled'
    >,
    effectiveRole: Role,
  ) {
    const data: Record<string, unknown> = {};
    if (input.baseSalary !== undefined) data.baseSalary = input.baseSalary;
    // Only EMPLOYEE-role users earn commission; for any other role we force the
    // stored percent to 0 so it can never accrue, regardless of the payload.
    if (effectiveRole !== Role.EMPLOYEE) {
      data.commissionPercent = 0;
    } else if (input.commissionPercent !== undefined) {
      data.commissionPercent = input.commissionPercent;
    }
    if (input.isCompensationEnabled !== undefined)
      data.isCompensationEnabled = input.isCompensationEnabled;
    if (input.compensationStartDate !== undefined) {
      data.compensationStartDate = input.compensationStartDate
        ? new Date(input.compensationStartDate)
        : null;
    }
    return data;
  }

  async findAll(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const where: Prisma.UserWhereInput = { role: { not: Role.ADMIN } };
      const [items, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: this.userSelect,
        }),
        this.prisma.user.count({ where }),
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

  // Active EMPLOYEE-role users a cashier can credit as the salesperson on an
  // order. Non-admins only see employees in their own store (plus unassigned
  // employees, who may sell anywhere); admins may scope by storeId or see all.
  async listSalespeople(user: AuthUser, storeId?: string) {
    const scoped = resolveStoreScope(user, storeId);
    return this.prisma.user.findMany({
      where: {
        role: Role.EMPLOYEE,
        isActive: true,
        ...(scoped ? { OR: [{ storeId: scoped }, { storeId: null }] } : {}),
      },
      orderBy: [{ fullName: 'asc' }, { email: 'asc' }],
      select: { id: true, fullName: true, email: true, storeId: true },
    });
  }

  async create(dto: CreateUserDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingUser) throw new BadRequestException('Email already exists');
      await this.ensureStoreExists(dto.storeId);

      const hashedPassword = await bcrypt.hash(dto.password, 10);
      return await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          password: hashedPassword,
          fullName: dto.fullName,
          phone: dto.phone,
          role: dto.role,
          storeId: dto.storeId,
          isActive: dto.isActive ?? true,
          ...this.buildCompensationData(dto, dto.role ?? Role.CASHIER),
        },
        select: this.userSelect,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: this.userSelect,
      });
      if (!user) throw new NotFoundException('User not found');
      return user;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    try {
      const existing = await this.findOne(id);

      if (dto.email) {
        const existingUserWithEmail = await this.prisma.user.findUnique({
          where: { email: dto.email },
          select: { id: true },
        });
        if (existingUserWithEmail && existingUserWithEmail.id !== id) {
          throw new BadRequestException('Email already exists');
        }
      }

      await this.ensureStoreExists(dto.storeId);

      const data: Prisma.UserUpdateInput = {};
      if (dto.email !== undefined) data.email = dto.email.toLowerCase().trim();
      if (dto.fullName !== undefined) data.fullName = dto.fullName;
      if (dto.phone !== undefined) data.phone = dto.phone;
      if (dto.role !== undefined) data.role = dto.role;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;
      if (dto.storeId !== undefined) {
        data.store = dto.storeId
          ? { connect: { id: dto.storeId } }
          : { disconnect: true };
      }
      Object.assign(
        data,
        this.buildCompensationData(dto, dto.role ?? existing.role),
      );
      if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

      return await this.prisma.user.update({
        where: { id },
        data,
        select: this.userSelect,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deactivate(id: string) {
    try {
      await this.findOne(id);
      return await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: this.userSelect,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async ensureStoreExists(storeId?: string) {
    if (!storeId) return;
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });
    if (!store) throw new BadRequestException('Assigned store does not exist');
  }
}
