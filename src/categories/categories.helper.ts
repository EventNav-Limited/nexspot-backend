import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service.js';
import { Categories, Prisma } from '../generated/prisma/client.js';

@Injectable()
export class CategoriesHelper {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.CategoriesCreateInput): Promise<Categories> {
    return this.prisma.categories.create({ data });
  }

  findAll() {
    return this.prisma.categories.findMany();
  }

  findById(id: string) {
    return this.prisma.categories.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.categories.findUnique({ where: { slug } });
  }

  findOne(where: Prisma.CategoriesWhereUniqueInput) {
    return this.prisma.categories.findUnique({
      where,
    });
  }

  update(id: string, data: Prisma.CategoriesUpdateInput): Promise<Categories> {
    return this.prisma.categories.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.categories.delete({ where: { id } });
  }
}
