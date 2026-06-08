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

  /**
   * Create a new event category. The slug is auto-generated from the name.
   *
   * @route POST /categories
   * @security BearerAuth
   * @role ADMIN
   *
   * @param createCategoryDto - { id, name, iconURL? }
   *
   * @returns {SuccessResponse<Category>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Insufficient role (ADMIN required)
   * @throws {409} CONFLICT - A category with this name already exists
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const data = await this.categoriesService.create(createCategoryDto);
    return successResponse(data);
  }

  /**
   * Return all event categories, ordered alphabetically.
   *
   * @route GET /categories
   * @security BearerAuth
   *
   * @returns {SuccessResponse<Category[]>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return successResponse(await this.categoriesService.findAll());
  }

  /**
   * Return a single category by its ID.
   *
   * @route GET /categories/:id
   * @security BearerAuth
   *
   * @param id - Category UUID
   *
   * @returns {SuccessResponse<Category>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {404} NOT_FOUND - Category not found
   */
  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async find(@Param('id') id: string) {
    return successResponse(await this.categoriesService.findOne(id));
  }

  /**
   * Delete a category by its ID.
   *
   * @route DELETE /categories/:id
   * @security BearerAuth
   * @role ADMIN
   *
   * @param id - Category UUID
   *
   * @returns {SuccessResponse<Category>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   * @throws {403} FORBIDDEN - Insufficient role (ADMIN required)
   * @throws {404} NOT_FOUND - Category not found
   */
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

  /**
   * Return all event format types (e.g. Conference, Workshop, Concert, Meetup).
   *
   * @route GET /formats
   * @security BearerAuth
   *
   * @returns {SuccessResponse<Format[]>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return successResponse(await this.categoriesService.findAllFormats());
  }
}
