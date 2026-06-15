import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/**
 * Shared query for date-scoped reports. Both dates are optional; the service
 * defaults to the last 7 days via resolveDateRange. Pagination applies to the
 * wide reports (product/category/supplier/current-stock); `all=true` is the
 * Print path and returns the full (range-capped) set, ignoring page/limit.
 */
export class ReportRangeQueryDto {
  @ApiPropertyOptional({
    example: '2026-05-26',
    description: 'Inclusive start',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-02', description: 'Inclusive end' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 25;

  @ApiPropertyOptional({
    description: 'Return the full set for printing (ignores pagination)',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  all?: boolean = false;
}
