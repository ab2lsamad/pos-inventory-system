import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'cashier@pos.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'securepassword123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^\S+$/, { message: 'Password cannot contain spaces' })
  password: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: '+92 300 1234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: Role, example: Role.CASHIER })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ example: 'store-uuid' })
  @IsString()
  @IsOptional()
  storeId?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 2500, minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  baseSalary?: number;

  @ApiPropertyOptional({ example: 5, minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  commissionPercent?: number;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsDateString()
  @IsOptional()
  compensationStartDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isCompensationEnabled?: boolean;
}
