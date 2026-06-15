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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationQueryDto } from '../shared/dto/pagination-query.dto';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new category' })
  async create(@Body() dto: CreateCategoryDto) {
    return await this.categoriesService.create(dto);
  }

  @Get()
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Get all categories' })
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
  ) {
    return await this.categoriesService.findAll(
      paginationQuery.page,
      paginationQuery.limit,
      { includeArchived: includeArchived === 'true', search },
    );
  }

  @Get('tree')
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Get categories as a nested tree' })
  async tree() {
    return await this.categoriesService.tree();
  }

  @Get(':id')
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Get a category by ID' })
  async findOne(@Param('id') id: string) {
    return await this.categoriesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Update a category' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return await this.categoriesService.update(id, dto);
  }

  @Patch(':id/archive')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Archive a category' })
  async archive(@Param('id') id: string) {
    return await this.categoriesService.archive(id);
  }
}
