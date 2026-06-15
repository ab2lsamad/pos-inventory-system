import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { Roles } from '../shared/decorators/roles.decorator';
import { CompensationService } from './compensation.service';
import { CompensationPeriodQueryDto } from './dto/compensation-period-query.dto';
import { CreateCompensationPayoutDto } from './dto/create-compensation-payout.dto';
import { ListCompensationPayoutsQueryDto } from './dto/list-compensation-payouts-query.dto';
import { UpdateCompensationPayoutDto } from './dto/update-compensation-payout.dto';

@ApiTags('compensation')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('compensation')
export class CompensationController {
  constructor(private readonly compensationService: CompensationService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Live employee compensation summary' })
  getSummary(@Query() query: CompensationPeriodQueryDto) {
    return this.compensationService.getSummary(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Compensation detail for one employee' })
  getEmployeeBreakdown(
    @Param('id') id: string,
    @Query() query: CompensationPeriodQueryDto,
  ) {
    return this.compensationService.getEmployeeBreakdown(id, query);
  }

  @Post('payouts')
  @ApiOperation({ summary: 'Create a payout snapshot' })
  createPayout(
    @Body() dto: CreateCompensationPayoutDto,
    @CurrentUser('id') generatedById: string,
  ) {
    return this.compensationService.createPayoutSnapshot(dto, generatedById);
  }

  @Get('payouts')
  @ApiOperation({ summary: 'List payout snapshots' })
  listPayouts(@Query() query: ListCompensationPayoutsQueryDto) {
    return this.compensationService.listPayouts(query);
  }

  @Get('payouts/:id')
  @ApiOperation({ summary: 'Get a payout by ID' })
  getPayout(@Param('id') id: string) {
    return this.compensationService.getPayout(id);
  }

  @Patch('payouts/:id')
  @ApiOperation({ summary: 'Update payout status / adjustment / notes' })
  updatePayout(
    @Param('id') id: string,
    @Body() dto: UpdateCompensationPayoutDto,
  ) {
    return this.compensationService.updatePayout(id, dto);
  }
}
