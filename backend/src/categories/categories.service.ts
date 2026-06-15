import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { formatSkuSequence, sanitizeSkuPart } from '../shared/utils/sku.util';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  constructor(private prisma: PrismaService) {}

  private async generateCategoryCode(name: string) {
    const base = sanitizeSkuPart(name, 6, 'CAT');
    const prefix = `${base}-`;
    const existing = await this.prisma.category.findMany({
      where: { code: { startsWith: prefix } },
      select: { code: true },
      orderBy: { code: 'desc' },
      take: 1,
    });
    const next = existing.length
      ? Number(existing[0].code.split('-').at(-1) || 0) + 1
      : 1;
    return `${prefix}${formatSkuSequence(next)}`;
  }

  async create(dto: CreateCategoryDto) {
    try {
      const name = dto.name.trim();
      const existing = await this.prisma.category.findUnique({
        where: { name },
      });
      if (existing)
        throw new BadRequestException('Category name already exists');

      let code = dto.code?.trim().toUpperCase();
      if (code) {
        const codeExists = await this.prisma.category.findUnique({
          where: { code },
        });
        if (codeExists)
          throw new BadRequestException('Category code already exists');
      } else {
        code = await this.generateCategoryCode(name);
      }

      if (dto.parentId) await this.ensureCategoryExists(dto.parentId);
      if (dto.taxRateId) await this.ensureTaxRateExists(dto.taxRateId);

      return await this.prisma.category.create({
        data: {
          name,
          code,
          description: dto.description,
          parentId: dto.parentId,
          taxRateId: dto.taxRateId,
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
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ];
      }
      const [items, total] = await Promise.all([
        this.prisma.category.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          include: {
            parent: { select: { id: true, name: true } },
            taxRate: { select: { id: true, name: true, rate: true } },
          },
        }),
        this.prisma.category.count({ where }),
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

  async tree() {
    try {
      const all = await this.prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: {
          taxRate: { select: { id: true, name: true, rate: true } },
        },
      });
      type Node = (typeof all)[number] & { children: Node[] };
      const byId = new Map<string, Node>();
      all.forEach((c) => byId.set(c.id, { ...c, children: [] }));
      const roots: Node[] = [];
      byId.forEach((node) => {
        if (node.parentId && byId.has(node.parentId)) {
          byId.get(node.parentId)!.children.push(node);
        } else {
          roots.push(node);
        }
      });
      return roots;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id },
        include: {
          parent: { select: { id: true, name: true } },
          children: { select: { id: true, name: true } },
          taxRate: { select: { id: true, name: true, rate: true } },
        },
      });
      if (!category) throw new NotFoundException('Category not found');
      return category;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    try {
      await this.findOne(id);

      if (dto.parentId) {
        if (dto.parentId === id)
          throw new BadRequestException('Category cannot be its own parent');
        await this.ensureCategoryExists(dto.parentId);
        await this.assertNoCycle(id, dto.parentId);
      }

      if (dto.taxRateId) await this.ensureTaxRateExists(dto.taxRateId);

      const data: Record<string, unknown> = {};
      if (dto.name !== undefined) data.name = dto.name.trim();
      if (dto.code !== undefined) data.code = dto.code.trim().toUpperCase();
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.parentId !== undefined) data.parentId = dto.parentId;
      if (dto.taxRateId !== undefined) data.taxRateId = dto.taxRateId;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;

      return await this.prisma.category.update({ where: { id }, data });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async archive(id: string) {
    await this.findOne(id);
    return await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async ensureCategoryExists(id: string) {
    const exists = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists)
      throw new BadRequestException('Parent category does not exist');
  }

  private async ensureTaxRateExists(id: string) {
    const exists = await this.prisma.taxRate.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException('Tax rate does not exist');
  }

  private async assertNoCycle(categoryId: string, proposedParentId: string) {
    let cursor: string | null = proposedParentId;
    const seen = new Set<string>();
    while (cursor) {
      if (cursor === categoryId)
        throw new BadRequestException(
          'Category hierarchy would create a cycle',
        );
      if (seen.has(cursor)) break;
      seen.add(cursor);
      const parent: { parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
      cursor = parent?.parentId ?? null;
    }
  }
}
