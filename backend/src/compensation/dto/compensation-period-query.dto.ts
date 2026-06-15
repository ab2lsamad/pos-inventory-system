import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CompensationPeriodQueryDto {
  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsDateString()
  periodStart: string;

  @ApiPropertyOptional({ example: '2026-04-30' })
  @IsDateString()
  periodEnd: string;

  @ApiPropertyOptional({ example: 'store-uuid' })
  @IsString()
  @IsOptional()
  storeId?: string;
}
