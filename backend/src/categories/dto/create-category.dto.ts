import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Beverages' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'BEV',
    description:
      'Optional short code. Auto-generated from name if not provided.',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'code must be uppercase alphanumeric (with - or _)',
  })
  code?: string;

  @ApiPropertyOptional({ example: 'Cold and hot drinks' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent category id (for hierarchy)' })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Default tax rate id for products' })
  @IsString()
  @IsOptional()
  taxRateId?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
