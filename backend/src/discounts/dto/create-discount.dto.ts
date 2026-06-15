import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountScope, DiscountType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateDiscountDto {
  @ApiProperty({ example: 'Eid Sale 20%' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'EID2026',
    description: 'Coupon code (optional). If set, must be unique.',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'code must be alphanumeric (letters and digits only)',
  })
  code?: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({ enum: DiscountScope, example: DiscountScope.ORDER })
  @IsEnum(DiscountScope)
  scope: DiscountScope;

  @ApiProperty({ example: 20, description: 'Percent or fixed amount' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value: number;

  @ApiPropertyOptional({ example: 1000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  minSubtotal?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiPropertyOptional({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  usageLimit?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description:
      'LINE_ITEM scope only: variant (SKU) IDs this discount may be applied to. Empty/omitted = applies to any variant. Must be empty for ORDER scope.',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  variantIds?: string[];
}
