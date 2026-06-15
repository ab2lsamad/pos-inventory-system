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
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@ApiTags('brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a brand' })
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Get()
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'List brands' })
  findAll(
    @Query() q: PaginationQueryDto,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.brandsService.findAll(q.page, q.limit, {
      includeArchived: includeArchived === 'true',
    });
  }

  @Get(':id')
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Get a brand' })
  findOne(@Param('id') id: string) {
    return this.brandsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Update a brand' })
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }

  @Patch(':id/archive')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Archive a brand' })
  archive(@Param('id') id: string) {
    return this.brandsService.archive(id);
  }

  @Patch(':id/deactivate')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate a brand (deprecated: use /archive)' })
  deactivate(@Param('id') id: string) {
    return this.brandsService.archive(id);
  }
}
