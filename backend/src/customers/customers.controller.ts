import {
  Body,
  Controller,
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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a customer' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get()
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'List customers' })
  findAll(
    @Query() q: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.customersService.findAll({
      page: q.page,
      limit: q.limit,
      search,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('lookup')
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Find a customer by phone' })
  lookup(@Query('phone') phone: string) {
    return this.customersService.findByPhone(phone);
  }

  @Get(':id')
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Get a customer by ID' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.MANAGER, Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Update a customer' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }
}
