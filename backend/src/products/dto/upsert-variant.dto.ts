import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateVariantDto {
  @ApiPropertyOptional({
    example: 'Red / Large',
    description: 'Optional. Auto-composed from attribute values if omitted.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  attributeValueIds?: string[];

  @ApiPropertyOptional({ description: 'Optional. Auto-generated if absent.' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ example: '1234567890123' })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiProperty({ example: 1200 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({ example: 700 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}
