import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { PaginationQueryDto } from '../shared/dto/pagination-query.dto';
import { TaxRatesService } from './tax-rates.service';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';

@ApiTags('tax-rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tax-rates')
export class TaxRatesController {
  constructor(private readonly taxRatesService: TaxRatesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a tax rate' })
  create(@Body() dto: CreateTaxRateDto) {
    return this.taxRatesService.create(dto);
  }

  @Get()
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'List tax rates' })
  findAll(
    @Query() q: PaginationQueryDto,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
  ) {
    return this.taxRatesService.findAll(q.page, q.limit, {
      includeArchived: includeArchived === 'true',
      search,
    });
  }

  @Get(':id')
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Get a tax rate' })
  findOne(@Param('id') id: string) {
    return this.taxRatesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a tax rate' })
  update(@Param('id') id: string, @Body() dto: UpdateTaxRateDto) {
    return this.taxRatesService.update(id, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Partially update a tax rate (supports archive via isActive: false)',
  })
  patch(@Param('id') id: string, @Body() dto: UpdateTaxRateDto) {
    return this.taxRatesService.update(id, dto);
  }
}
