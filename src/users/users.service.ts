import { Injectable } from '@nestjs/common';
import { Prisma, users } from '../generated/prisma/client.js';
import { PrismaService } from '../config/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.usersCreateInput): Promise<Omit<users, 'password'>> {
    return this.prisma.users.create({ data });
  }

  findAll(): Promise<Omit<users, 'password'>[]> {
    return this.prisma.users.findMany();
  }

  findByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }

  findById(id: string) {
    return this.prisma.users.findUnique({
      where: { id },
    });
  }

  update(id: string, data: Prisma.usersUpdateInput) {
    return this.prisma.users.update({
      where: {
        id, // Must be a unique field
      },
      data,
    });
  }
}
