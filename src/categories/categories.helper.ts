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
    return this.prisma.categories.findMany({
      include: { _count: { select: { event: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.categories.findUnique({
      where: { id },
      include: { _count: { select: { event: true } } },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.categories.findUnique({ where: { slug } });
  }

  findOne(where: Prisma.CategoriesWhereUniqueInput) {
    return this.prisma.categories.findUnique({
      where,
      include: { _count: { select: { event: true } } },
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
