import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpsertSupplierProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supplierSku?: string;

  @ApiProperty({ example: 600 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice: number;

  @ApiPropertyOptional({ example: 7 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  leadTimeDays?: number;
}

export class UpdateSupplierProductDto extends PartialType(
  UpsertSupplierProductDto,
) {}
