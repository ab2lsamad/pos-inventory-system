import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import {
  UpdateSupplierProductDto,
  UpsertSupplierProductDto,
} from './dto/supplier-product.dto';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER, Role.ADMIN)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a supplier' })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List suppliers' })
  findAll(@Query() q: PaginationQueryDto) {
    return this.suppliersService.findAll(q.page, q.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a supplier by ID' })
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a supplier' })
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Post(':id/products')
  @ApiOperation({ summary: 'Link a variant to a supplier with cost info' })
  addProduct(
    @Param('id') supplierId: string,
    @Body() dto: UpsertSupplierProductDto,
  ) {
    return this.suppliersService.addProduct(supplierId, dto);
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'List variants linked to a supplier' })
  listProducts(@Param('id') supplierId: string) {
    return this.suppliersService.listProducts(supplierId);
  }

  @Put(':id/products/:variantId')
  @ApiOperation({ summary: 'Update supplier variant link' })
  updateProduct(
    @Param('id') supplierId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateSupplierProductDto,
  ) {
    return this.suppliersService.updateProduct(supplierId, variantId, dto);
  }

  @Delete(':id/products/:variantId')
  @ApiOperation({ summary: 'Remove supplier variant link' })
  removeProduct(
    @Param('id') supplierId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.suppliersService.removeProduct(supplierId, variantId);
  }
}
