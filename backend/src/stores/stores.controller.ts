import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { PaginationQueryDto } from '../shared/dto/pagination-query.dto';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  // Managers need to read the store list (e.g. transfer destinations,
  // purchase-order store selection). Store management stays ADMIN-only.
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get all stores' })
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return await this.storesService.findAll(
      paginationQuery.page,
      paginationQuery.limit,
      {
        includeArchived: includeArchived === 'true',
      },
    );
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new store' })
  async create(@Body() createStoreDto: CreateStoreDto) {
    return await this.storesService.create(createStoreDto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get a specific store by ID' })
  async findOne(@Param('id') id: string) {
    return await this.storesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a specific store' })
  async update(
    @Param('id') id: string,
    @Body() updateStoreDto: UpdateStoreDto,
  ) {
    return await this.storesService.update(id, updateStoreDto);
  }

  @Patch(':id/archive')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Archive a store (soft deactivate)' })
  async archive(@Param('id') id: string) {
    return await this.storesService.archive(id);
  }
}
