import { Injectable } from '@nestjs/common';
import { Prisma, Users } from '../generated/prisma/client.js';
import { PrismaService } from '../config/prisma.service.js';
import { formatTimestamp } from '../lib/timezone.lib.js';

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

  mapRequest(request: any, timezone = 'UTC') {
    return {
      id: request.id,
      createdAt: formatTimestamp(request.createdAt, timezone),
      status: request.status,
      reviewedAt: request.reviewedAt
        ? formatTimestamp(request.reviewedAt, timezone)
        : null,
      reviewNote: request.reviewNote,
    };
  }

  // TODO: Fix timezone for input and output
  // formatDateDisplay is now handled by timezone.lib.ts
}
