import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto, UpdateVariantDto } from './dto/upsert-variant.dto';
import { PaginationQueryDto } from '../shared/dto/pagination-query.dto';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new product (with variants)' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'List products (excludes archived by default)' })
  findAll(
    @Query() q: PaginationQueryDto,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('categoryIds') categoryIds?: string,
    @Query('brandId') brandId?: string,
  ) {
    // `categoryIds` is a comma-separated list — used by the FE to expand a
    // selected parent category to all its descendants client-side. `categoryId`
    // is kept for single-value callers (e.g. POS quick filter).
    const ids = categoryIds
      ? categoryIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : categoryId
        ? [categoryId]
        : undefined;
    return this.productsService.findAll(q.page, q.limit, {
      includeArchived: includeArchived === 'true',
      search,
      type,
      categoryIds: ids,
      brandId,
    });
  }

  @Get('barcodes/generate')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Generate unique EAN-13 barcodes for new variants' })
  async generateBarcodes(
    @Query('count', new DefaultValuePipe(1), ParseIntPipe) count: number,
  ) {
    const barcodes = await this.productsService.generateBarcodes(count);
    return { barcodes };
  }

  @Get('barcode/:barcode')
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Look up product variant by barcode' })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get(':id')
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Get a product by ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Update a product (optionally with variants)' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/archive')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Archive a product (soft delete)' })
  archive(@Param('id') id: string) {
    return this.productsService.archive(id);
  }

  @Delete(':id')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({
    summary: 'Archive a product (deprecated: use PATCH :id/archive)',
  })
  archiveDelete(@Param('id') id: string) {
    return this.productsService.archive(id);
  }

  @Post(':id/variants')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Add a variant to a product' })
  addVariant(@Param('id') productId: string, @Body() dto: CreateVariantDto) {
    return this.productsService.addVariant(productId, dto);
  }

  @Put('variants/:variantId')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Update a variant' })
  updateVariant(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariant(variantId, dto);
  }

  @Patch('variants/:variantId/deactivate')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate a variant (soft)' })
  deactivateVariant(@Param('variantId') variantId: string) {
    return this.productsService.deactivateVariant(variantId);
  }
}
