import {
  Controller,
  Post,
  Body,
  UseGuards,
  Delete,
  Param,
  Patch,
  Get,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { successResponse } from '../lib/response.lib.js';
import { RolesGuard } from '../auth/guard/role.guard.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { FindCategoryDto } from './dto/find-category.dto.js';
import { BadRequestException } from '../lib/error.lib.js';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const data = await this.categoriesService.create(createCategoryDto);
    return successResponse(data);
  }

  @Get()
  async findAll() {
    return successResponse(await this.categoriesService.findAll());
  }

  @Get('/one')
  async find(@Query() query: FindCategoryDto) {
    const { slug, id } = query;

    if (slug && id) {
      throw new BadRequestException('Provide either slug or id, not both');
    }

    return successResponse(await this.categoriesService.findOne({ slug, id }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const data = await this.categoriesService.update(id, updateCategoryDto);
    return successResponse(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.categoriesService.remove(id);
    return successResponse(data);
  }
}
