import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PurchaseOrderStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { AuthUser } from 'src/shared/utils/store-scope.util';
import { PaginationQueryDto } from '../shared/dto/pagination-query.dto';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER, Role.ADMIN)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft purchase order' })
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.purchaseOrdersService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List purchase orders' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() q: PaginationQueryDto,
    @Query('storeId') storeId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: PurchaseOrderStatus,
  ) {
    return this.purchaseOrdersService.findAll(user, {
      page: q.page,
      limit: q.limit,
      storeId,
      supplierId,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a PO by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.purchaseOrdersService.findOne(id, user);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a DRAFT PO (DRAFT → ORDERED)' })
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.purchaseOrdersService.submit(id, user);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a PO' })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.purchaseOrdersService.cancel(id, user);
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Receive stock (full or partial) against a PO' })
  receive(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.purchaseOrdersService.receive(id, dto, user);
  }
}
