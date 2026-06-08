import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from '../dto/create-category.dto.js';
import { CategoriesHelper } from '../categories.helper.js';
import { slugify } from '../../lib/regex.lib.js';
import { ConflictException, NotFoundException } from '../../lib/error.lib.js';

@Injectable()
export class CategoriesService {
  constructor(private categoriesHelper: CategoriesHelper) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const category = await this.categoriesHelper.findBySlug(
      slugify(createCategoryDto.name),
    );
    if (category) {
      throw new ConflictException('category already exists');
    }
    return await this.categoriesHelper.create({
      id: createCategoryDto.id,
      name: createCategoryDto.name,
      slug: slugify(createCategoryDto.name),
      iconURL: createCategoryDto.iconURL || '',
    });
  }

  async findAll() {
    return this.categoriesHelper.findAll();
  }

  async findAllFormats() {
    return this.categoriesHelper.findAllFormats();
  }

  async findOne(id: string) {
    const category = await this.categoriesHelper.findOne({ id });
    if (!category) {
      throw new NotFoundException('category');
    }
    return category;
  }

  async remove(id: string) {
    const category = await this.categoriesHelper.findById(id);
    if (!category) throw new NotFoundException('category');
    return await this.categoriesHelper.delete(id);
  }
}
