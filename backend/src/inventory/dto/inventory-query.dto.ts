import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { StockMovementType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class InventoryLevelsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Match product name/SKU or variant name/SKU',
  })
  @IsOptional()
  @IsString()
  search?: string;

  // InventoryLevel has no category column of its own — category lives on
  // Product (InventoryLevel → ProductVariant → Product.categoryId). This filter
  // restricts levels to those whose variant's product is in one of the given
  // categories, used by the dashboard's category-scoped restock watchlist.
  @ApiPropertyOptional({
    description:
      'Comma-separated category IDs; only levels whose variant.product belongs to one of these categories are returned',
  })
  @IsOptional()
  @IsString()
  categoryIds?: string;

  @ApiPropertyOptional()
  @IsOptional()
  // Query values arrive as strings — Boolean('false') is truthy, so map
  // explicitly. Anything that isn't the literal "true" is treated as false.
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  lowStockOnly?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class InventoryMovementsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ enum: StockMovementType })
  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
