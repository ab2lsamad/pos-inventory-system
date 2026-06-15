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
import { OrderStatus, PaymentMethod, Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { AuthUser } from 'src/shared/utils/store-scope.util';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderAdjustmentDto } from './dto/create-order-adjustment.dto';
import { PaginationQueryDto } from '../shared/dto/pagination-query.dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CASHIER, Role.MANAGER, Role.ADMIN)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Process a new checkout' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.ordersService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List orders (with filters)' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() q: PaginationQueryDto,
    @Query('storeId') storeId?: string,
    @Query('customerId') customerId?: string,
    @Query('cashierId') cashierId?: string,
    @Query('salespersonId') salespersonId?: string,
    @Query('status') status?: OrderStatus,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('receiptNumber') receiptNumber?: string,
  ) {
    return this.ordersService.findAll(user, {
      page: q.page,
      limit: q.limit,
      storeId,
      customerId,
      cashierId,
      salespersonId,
      status,
      paymentMethod,
      from,
      to,
      receiptNumber: receiptNumber ? Number(receiptNumber) : undefined,
    });
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Aggregate order count and revenue for a range' })
  stats(
    @CurrentUser() user: AuthUser,
    @Query('storeId') storeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.ordersService.stats(user, { storeId, from, to });
  }

  @Get('adjustments/:adjustmentId')
  @ApiOperation({ summary: 'Get a specific adjustment by ID' })
  findAdjustment(
    @Param('adjustmentId') adjustmentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.findAdjustment(adjustmentId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.findOne(id, user);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Get formatted receipt for an order' })
  receipt(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.receipt(id, user);
  }

  @Get(':id/return-summary')
  @ApiOperation({ summary: 'Get returnable quantities for an order' })
  returnSummary(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.getReturnSummary(id, user);
  }

  @Get(':id/adjustments')
  @ApiOperation({ summary: 'List adjustments for an order' })
  listAdjustments(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.listAdjustments(id, user);
  }

  @Post(':id/adjustments')
  @ApiOperation({ summary: 'Create a return/exchange adjustment' })
  createAdjustment(
    @Param('id') id: string,
    @Body() dto: CreateOrderAdjustmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.createAdjustment(id, dto, user);
  }

  @Post(':id/void')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Void an order (admin/manager) and restore stock' })
  voidOrder(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.voidOrder(id, user);
  }
}
