import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAttributeDto,
  CreateAttributeValueDto,
  ReorderDto,
  UpdateAttributeDto,
  UpdateAttributeValueDto,
} from './dto/attribute.dto';

@Injectable()
export class AttributesService {
  private readonly logger = new Logger(AttributesService.name);
  constructor(private prisma: PrismaService) {}

  private readonly include = {
    values: {
      orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }],
    },
  };

  async findAll(opts: { includeInactive?: boolean } = {}) {
    const where: Prisma.AttributeWhereInput = opts.includeInactive
      ? {}
      : { isActive: true };
    return this.prisma.attribute.findMany({
      where,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: this.include,
    });
  }

  async findOne(id: string) {
    const attr = await this.prisma.attribute.findUnique({
      where: { id },
      include: this.include,
    });
    if (!attr) throw new NotFoundException('Attribute not found');
    return attr;
  }

  async create(dto: CreateAttributeDto) {
    try {
      const name = dto.name.trim();
      const existing = await this.prisma.attribute.findUnique({
        where: { name },
      });
      if (existing)
        throw new BadRequestException('Attribute name already exists');

      const max = await this.prisma.attribute.aggregate({
        _max: { position: true },
      });
      const position = (max._max.position ?? -1) + 1;

      return this.prisma.$transaction(async (tx) => {
        const attribute = await tx.attribute.create({
          data: {
            name,
            position,
            isActive: dto.isActive ?? true,
          },
        });
        if (dto.values?.length) {
          const seen = new Set<string>();
          const data = dto.values
            .map((v, idx) => {
              const value = v.value.trim();
              if (!value) return null;
              const key = value.toLowerCase();
              if (seen.has(key))
                throw new BadRequestException(`Duplicate value: ${value}`);
              seen.add(key);
              return {
                attributeId: attribute.id,
                value,
                position: idx,
                isActive: v.isActive ?? true,
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);
          if (data.length) await tx.attributeValue.createMany({ data });
        }
        return tx.attribute.findUnique({
          where: { id: attribute.id },
          include: this.include,
        });
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateAttributeDto) {
    try {
      await this.findOne(id);
      if (dto.name) {
        const name = dto.name.trim();
        const existing = await this.prisma.attribute.findFirst({
          where: { name, NOT: { id } },
          select: { id: true },
        });
        if (existing)
          throw new BadRequestException('Attribute name already exists');
      }
      return this.prisma.attribute.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
        include: this.include,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    const usage = await this.prisma.variantAttributeValue.count({
      where: { attributeValue: { attributeId: id } },
    });
    if (usage > 0)
      throw new BadRequestException(
        'Attribute is in use by one or more variants — deactivate instead',
      );
    return this.prisma.attribute.delete({ where: { id } });
  }

  async addValue(attributeId: string, dto: CreateAttributeValueDto) {
    try {
      await this.findOne(attributeId);
      const value = dto.value.trim();
      if (!value) throw new BadRequestException('Value cannot be empty');
      const exists = await this.prisma.attributeValue.findUnique({
        where: { attributeId_value: { attributeId, value } },
      });
      if (exists) throw new BadRequestException('Value already exists');

      const max = await this.prisma.attributeValue.aggregate({
        _max: { position: true },
        where: { attributeId },
      });
      const position = (max._max.position ?? -1) + 1;

      return this.prisma.attributeValue.create({
        data: {
          attributeId,
          value,
          position,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateValue(valueId: string, dto: UpdateAttributeValueDto) {
    try {
      const existing = await this.prisma.attributeValue.findUnique({
        where: { id: valueId },
      });
      if (!existing) throw new NotFoundException('Value not found');
      if (dto.value) {
        const value = dto.value.trim();
        if (!value) throw new BadRequestException('Value cannot be empty');
        const conflict = await this.prisma.attributeValue.findFirst({
          where: {
            attributeId: existing.attributeId,
            value,
            NOT: { id: valueId },
          },
          select: { id: true },
        });
        if (conflict) throw new BadRequestException('Value already exists');
      }
      return this.prisma.attributeValue.update({
        where: { id: valueId },
        data: {
          ...(dto.value !== undefined && { value: dto.value.trim() }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async removeValue(valueId: string) {
    const existing = await this.prisma.attributeValue.findUnique({
      where: { id: valueId },
    });
    if (!existing) throw new NotFoundException('Value not found');
    const usage = await this.prisma.variantAttributeValue.count({
      where: { attributeValueId: valueId },
    });
    if (usage > 0)
      throw new BadRequestException(
        'Value is in use by one or more variants — deactivate instead',
      );
    return this.prisma.attributeValue.delete({ where: { id: valueId } });
  }

  async reorderAttributes(dto: ReorderDto) {
    return this.prisma.$transaction(
      dto.items.map((i) =>
        this.prisma.attribute.update({
          where: { id: i.id },
          data: { position: i.position },
        }),
      ),
    );
  }

  async reorderValues(attributeId: string, dto: ReorderDto) {
    await this.findOne(attributeId);
    return this.prisma.$transaction(
      dto.items.map((i) =>
        this.prisma.attributeValue.update({
          where: { id: i.id },
          data: { position: i.position },
        }),
      ),
    );
  }
}
