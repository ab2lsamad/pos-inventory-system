import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProductType } from '@prisma/client';

export class CreateProductVariantDto {
  @ApiPropertyOptional({ example: 'variant-uuid' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({
    example: 'Red / Large',
    description:
      'Optional. Auto-composed from attribute values if omitted (e.g. "Red / L").',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'AttributeValue IDs that define this variant. Must each come from a different Attribute.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  attributeValueIds?: string[];

  @ApiPropertyOptional({
    example: 'TSHIRT-RED-L-001',
    description: 'Optional. Auto-generated if not supplied.',
  })
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

export class CreateProductDto {
  @ApiProperty({ example: "Men's T-Shirt" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Cotton crew neck' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ProductType, default: ProductType.SIMPLE })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional({ example: 'category-uuid' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'brand-uuid' })
  @IsString()
  @IsOptional()
  brandId?: string;

  @ApiPropertyOptional({ example: 'tax-rate-uuid' })
  @IsString()
  @IsOptional()
  taxRateId?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/img.png' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    type: [CreateProductVariantDto],
    description:
      'For SIMPLE products send exactly 1 variant with no attributeValueIds. For VARIABLE send 1+ variants each with attributeValueIds.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];
}
