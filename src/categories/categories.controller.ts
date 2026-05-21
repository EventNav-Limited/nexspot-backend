import {
  Controller,
  Post,
  Body,
  UseGuards,
  Delete,
  Param,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { successResponse } from '../lib/response.lib.js';
import { RolesGuard } from '../auth/guard/role.guard.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const data = await this.categoriesService.create(createCategoryDto);
    return successResponse(data);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return successResponse(await this.categoriesService.findAll());
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async find(@Param(':id') id: string) {
    return successResponse(await this.categoriesService.findOne(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.categoriesService.remove(id);
    return successResponse(data);
  }
}
@UseGuards(JwtAuthGuard)
@Controller('formats')
export class FormatCntroller {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return successResponse(await this.categoriesService.findAllFormats());
  }
}
