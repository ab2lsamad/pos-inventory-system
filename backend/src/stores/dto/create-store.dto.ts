import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ example: 'Main Branch' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'MAIN' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'code must be uppercase alphanumeric (with - or _)',
  })
  code: string;

  @ApiPropertyOptional({ example: '123 New York Ave, NY' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: '+92 300 1234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'PKR', default: 'PKR' })
  @IsString()
  @IsOptional()
  @Length(3, 3, { message: 'currency must be a 3-letter ISO 4217 code' })
  currency?: string;

  @ApiPropertyOptional({ example: 'NTN-1234567' })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
