import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCompensationPayoutDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  userId: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-04-30' })
  @IsDateString()
  periodEnd: string;

  @ApiPropertyOptional({
    example: 150,
    description:
      'Manual adjustment for this payout. Positive for bonuses/perks, negative for deductions (e.g. leave).',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  adjustmentAmount?: number;

  @ApiPropertyOptional({ example: 'Attendance bonus included' })
  @IsString()
  @IsOptional()
  notes?: string;
}
