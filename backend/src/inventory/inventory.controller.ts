import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import {
  AuthUser,
  assertStoreAccess,
  resolveStoreScope,
} from 'src/shared/utils/store-scope.util';
import { InventoryService } from './inventory.service';
import { AdjustStockDto, RecordCountDto } from './dto/adjust-stock.dto';
import { SetReorderDto } from './dto/set-reorder.dto';
import {
  InventoryLevelsQueryDto,
  InventoryMovementsQueryDto,
} from './dto/inventory-query.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('levels')
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'List inventory levels' })
  listLevels(
    @Query() q: InventoryLevelsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.listLevels({
      // Non-admins only ever see their own store's levels.
      storeId: resolveStoreScope(user, q.storeId),
      search: q.search,
      categoryIds: q.categoryIds
        ?.split(',')
        .map((id) => id.trim())
        .filter(Boolean),
      lowStockOnly: q.lowStockOnly,
      page: q.page,
      limit: q.limit,
    });
  }

  @Get('levels/:storeId/:variantId')
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Get a single inventory level' })
  getLevel(
    @Param('storeId') storeId: string,
    @Param('variantId') variantId: string,
    @CurrentUser() user: AuthUser,
  ) {
    assertStoreAccess(user, storeId);
    return this.inventoryService.getLevel(storeId, variantId);
  }

  @Patch('levels')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({
    summary: 'Set reorder point / quantity for an inventory level',
  })
  setReorder(@Body() dto: SetReorderDto, @CurrentUser() user: AuthUser) {
    assertStoreAccess(user, dto.storeId);
    return this.inventoryService.setReorder(dto);
  }

  @Post('adjust')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Manually adjust stock (+/- delta)' })
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: AuthUser) {
    assertStoreAccess(user, dto.storeId);
    return this.inventoryService.manualAdjust(dto, user.id);
  }

  @Post('count')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Record a physical stock count' })
  count(@Body() dto: RecordCountDto, @CurrentUser() user: AuthUser) {
    assertStoreAccess(user, dto.storeId);
    return this.inventoryService.recordCount(dto, user.id);
  }

  @Get('movements')
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'List stock movements (ledger)' })
  listMovements(
    @Query() q: InventoryMovementsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.listMovements({
      // Non-admins only ever see their own store's ledger.
      storeId: resolveStoreScope(user, q.storeId),
      variantId: q.variantId,
      type: q.type,
      from: q.from,
      to: q.to,
      page: q.page,
      limit: q.limit,
    });
  }

  @Get('movements/:id')
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Get a stock movement by ID' })
  async getMovement(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const movement = await this.inventoryService.getMovement(id);
    assertStoreAccess(user, movement.storeId);
    return movement;
  }
}
