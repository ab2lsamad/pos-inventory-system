import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateTaxRateDto {
  @ApiProperty({ example: 'GST 17%' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 17 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  rate: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isInclusive?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
