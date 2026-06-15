import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AdjustStockDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({
    description: 'Signed delta. Positive = stock in, negative = stock out.',
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  delta: number;

  @ApiPropertyOptional({ description: 'Per-unit cost for valuation' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RecordCountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({ description: 'Counted physical quantity', example: 42 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  countedQuantity: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
