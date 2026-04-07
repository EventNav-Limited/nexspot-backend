import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoriesHelper } from './categories.helper.js';
import { slugify } from '../lib/regex.lib.js';
import { ConflictException, NotFoundException } from '../lib/error.lib.js';
import { Prisma } from 'src/generated/prisma/client.js';

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
      name: createCategoryDto.name,
      slug: slugify(createCategoryDto.name),
      iconURL: createCategoryDto.iconURL || '',
    });
  }

  async findAll() {
    return this.categoriesHelper.findAll();
  }

  async findOne({ slug, id }: { slug?: string; id?: string }) {
    const where = slug ? { slug } : { id };
    const category = await this.categoriesHelper.findOne(where);
    if (!category) {
      throw new NotFoundException('category');
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoriesHelper.findById(id);
    if (!category) {
      throw new NotFoundException('category');
    }

    const data: Prisma.CategoriesUpdateInput = {};

    if (
      updateCategoryDto.name !== undefined &&
      updateCategoryDto.name.trim() !== ''
    ) {
      data.name = updateCategoryDto.name;
      data.slug = slugify(updateCategoryDto.name); // auto-update slug when name changes
    }

    if (updateCategoryDto.iconURL !== undefined) {
      data.iconURL = updateCategoryDto.iconURL;
    }

    return await this.categoriesHelper.update(id, data);
  }

  async remove(id: string) {
    const category = await this.categoriesHelper.findById(id);
    if (!category) throw new NotFoundException('category');
    return await this.categoriesHelper.delete(id);
  }
}
