import { Injectable } from '@nestjs/common';
import { Prisma, Users } from '../generated/prisma/client.js';
import { PrismaService } from '../config/prisma.service.js';

@Injectable()
export class UsersHelper {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.UsersCreateInput): Promise<Users> {
    return this.prisma.users.create({ data });
  }

  findAll(): Promise<Omit<Users, 'password'>[]> {
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

  findByGoogleId(googleId: string) {
    return this.prisma.users.findUnique({
      where: { googleId },
    });
  }

  update(id: string, data: Prisma.UsersUpdateInput) {
    return this.prisma.users.update({
      where: {
        id, // Must be a unique field
      },
      data,
    });
  }
  delete(id: string) {
    return this.prisma.users.delete({
      where: {
        id,
      },
    });
  }

  completeOnboarding(id: string): Promise<Users> {
    return this.prisma.users.update({
      where: { id },
      data: { onboardingCompleted: true },
    });
  }
}
