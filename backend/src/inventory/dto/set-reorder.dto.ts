import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class SetReorderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  variantId: string;

  @ApiProperty({
    description:
      'Low-stock threshold; item is flagged when quantity <= reorderPoint.',
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderPoint: number;

  @ApiPropertyOptional({
    description: 'Suggested quantity to reorder when restocking.',
    example: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  reorderQty?: number;
}
