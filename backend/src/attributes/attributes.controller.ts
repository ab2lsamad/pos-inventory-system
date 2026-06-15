import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../shared/decorators/roles.decorator';
import { AttributesService } from './attributes.service';
import {
  CreateAttributeDto,
  CreateAttributeValueDto,
  ReorderDto,
  UpdateAttributeDto,
  UpdateAttributeValueDto,
} from './dto/attribute.dto';

@ApiTags('attributes')
@ApiBearerAuth()
@Controller('attributes')
export class AttributesController {
  constructor(private readonly service: AttributesService) {}

  @Get()
  @ApiOperation({ summary: 'List attributes with their values' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.service.findAll({
      includeInactive: includeInactive === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single attribute with values' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create an attribute (optionally with values)' })
  create(@Body() dto: CreateAttributeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update an attribute' })
  update(@Param('id') id: string, @Body() dto: UpdateAttributeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete an attribute (only if unused)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('reorder')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reorder attributes' })
  reorder(@Body() dto: ReorderDto) {
    return this.service.reorderAttributes(dto);
  }

  @Post(':id/values')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Add a value to an attribute' })
  addValue(@Param('id') id: string, @Body() dto: CreateAttributeValueDto) {
    return this.service.addValue(id, dto);
  }

  @Patch('values/:valueId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update an attribute value' })
  updateValue(
    @Param('valueId') valueId: string,
    @Body() dto: UpdateAttributeValueDto,
  ) {
    return this.service.updateValue(valueId, dto);
  }

  @Delete('values/:valueId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete an attribute value (only if unused)' })
  removeValue(@Param('valueId') valueId: string) {
    return this.service.removeValue(valueId);
  }

  @Post(':id/values/reorder')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reorder values of an attribute' })
  reorderValues(@Param('id') id: string, @Body() dto: ReorderDto) {
    return this.service.reorderValues(id, dto);
  }
}
