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
import { Role, TransferStatus } from '@prisma/client';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { AuthUser } from 'src/shared/utils/store-scope.util';
import { PaginationQueryDto } from '../shared/dto/pagination-query.dto';
import { TransfersService } from './transfers.service';
import {
  CreateTransferDto,
  ReceiveTransferDto,
} from './dto/create-transfer.dto';

@ApiTags('transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER, Role.ADMIN)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft stock transfer' })
  create(@Body() dto: CreateTransferDto, @CurrentUser() user: AuthUser) {
    return this.transfersService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List transfers' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() q: PaginationQueryDto,
    @Query('fromStoreId') fromStoreId?: string,
    @Query('toStoreId') toStoreId?: string,
    @Query('status') status?: TransferStatus,
  ) {
    return this.transfersService.findAll(user, {
      page: q.page,
      limit: q.limit,
      fromStoreId,
      toStoreId,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transfer by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.transfersService.findOne(id, user);
  }

  @Post(':id/ship')
  @ApiOperation({ summary: 'Ship a DRAFT transfer (decrements source stock)' })
  ship(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.transfersService.ship(id, user);
  }

  @Post(':id/receive')
  @ApiOperation({
    summary: 'Receive an IN_TRANSIT transfer (increments destination)',
  })
  receive(
    @Param('id') id: string,
    @Body() dto: ReceiveTransferDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transfersService.receive(id, dto, user);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a DRAFT transfer' })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.transfersService.cancel(id, user);
  }
}
