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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { PaginationQueryDto } from '../shared/dto/pagination-query.dto';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AuthUser } from 'src/shared/utils/store-scope.util';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  async findAll(@Query() paginationQuery: PaginationQueryDto) {
    return await this.usersService.findAll(
      paginationQuery.page,
      paginationQuery.limit,
    );
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  async create(@Body() dto: CreateUserDto) {
    return await this.usersService.create(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated user' })
  async findMe(@CurrentUser('id') userId: string) {
    return await this.usersService.findOne(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update the current authenticated user' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return await this.usersService.update(userId, dto);
  }

  @Get('salespeople')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  @ApiOperation({
    summary: 'List active salespeople (EMPLOYEE role) for order attribution',
  })
  async listSalespeople(
    @CurrentUser() user: AuthUser,
    @Query('storeId') storeId?: string,
  ) {
    return await this.usersService.listSalespeople(user, storeId);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get a user by ID' })
  async findOne(@Param('id') id: string) {
    return await this.usersService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a user by ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return await this.usersService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate a user (soft-disable)' })
  async deactivate(@Param('id') id: string) {
    return await this.usersService.deactivate(id);
  }
}
