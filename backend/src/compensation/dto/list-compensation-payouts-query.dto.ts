import { ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class ListCompensationPayoutsQueryDto {
  @ApiPropertyOptional({ example: 'user-uuid' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsDateString()
  @IsOptional()
  periodStart?: string;

  @ApiPropertyOptional({ example: '2026-04-30' })
  @IsDateString()
  @IsOptional()
  periodEnd?: string;

  @ApiPropertyOptional({ enum: PayoutStatus })
  @IsEnum(PayoutStatus)
  @IsOptional()
  status?: PayoutStatus;
}
