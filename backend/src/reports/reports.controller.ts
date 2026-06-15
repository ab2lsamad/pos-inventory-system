import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../shared/decorators/roles.decorator';
import { ReportRangeQueryDto } from './dto/report-range-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Sales / refund / revenue / cost / profit totals' })
  summary(@Query() query: ReportRangeQueryDto) {
    return this.reportsService.summary(query);
  }

  @Get('sales-count')
  @ApiOperation({ summary: 'Sales and refunds by payment method' })
  salesCount(@Query() query: ReportRangeQueryDto) {
    return this.reportsService.salesCount(query);
  }

  @Get('product-sales')
  @ApiOperation({ summary: 'Sales and refunds grouped by product' })
  productSales(@Query() query: ReportRangeQueryDto) {
    return this.reportsService.productSales(query);
  }

  @Get('category-sales')
  @ApiOperation({ summary: 'Sales and refunds grouped by category' })
  categorySales(@Query() query: ReportRangeQueryDto) {
    return this.reportsService.categorySales(query);
  }

  @Get('supplier-sales')
  @ApiOperation({ summary: 'Sales and refunds grouped by primary supplier' })
  supplierSales(@Query() query: ReportRangeQueryDto) {
    return this.reportsService.supplierSales(query);
  }

  @Get('current-stock')
  @ApiOperation({
    summary: 'Current on-hand stock and value (today, no range)',
  })
  currentStock(@Query() query: ReportRangeQueryDto) {
    return this.reportsService.currentStock(query);
  }

  @Get('store-sales')
  @ApiOperation({ summary: 'Sales and refunds grouped by store' })
  storeSales(@Query() query: ReportRangeQueryDto) {
    return this.reportsService.storeSales(query);
  }

  @Get('user-sales')
  @ApiOperation({ summary: 'Sales and refunds grouped by cashier' })
  userSales(@Query() query: ReportRangeQueryDto) {
    return this.reportsService.userSales(query);
  }

  @Get('tax-breakdown')
  @ApiOperation({ summary: 'Sale vs refund tax breakdown' })
  taxBreakdown(@Query() query: ReportRangeQueryDto) {
    return this.reportsService.taxBreakdown(query);
  }
}
