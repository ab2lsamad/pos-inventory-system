import {
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
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class OrderAdjustmentReturnItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderItemId: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    default: true,
    description: 'Restock the variant back to inventory',
  })
  @IsOptional()
  @IsBoolean()
  restock?: boolean;
}

export class OrderAdjustmentSaleItemDiscountDto {
  @ApiPropertyOptional({
    description: 'Discount id (if linked to a configured Discount)',
  })
  @IsOptional()
  @IsString()
  discountId?: string;

  @ApiProperty({ example: 'Eid Sale 10%' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 60, description: 'Discount amount (Decimal)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;
}

export class OrderAdjustmentSaleItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ type: [OrderAdjustmentSaleItemDiscountDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderAdjustmentSaleItemDiscountDto)
  discounts?: OrderAdjustmentSaleItemDiscountDto[];
}

export class CreateOrderAdjustmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Cash tendered for additional charge (null for pure refunds)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amountPaid?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [OrderAdjustmentReturnItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderAdjustmentReturnItemDto)
  returns?: OrderAdjustmentReturnItemDto[];

  @ApiPropertyOptional({ type: [OrderAdjustmentSaleItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderAdjustmentSaleItemDto)
  newItems?: OrderAdjustmentSaleItemDto[];
}
