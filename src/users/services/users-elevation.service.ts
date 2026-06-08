import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service.js';
import { UsersHelper } from '../../users/users.helper.js';
import { ConflictException } from '../../lib/error.lib.js';
import { TimezoneHelper } from '../../lib/timezone.helper.js';

@Injectable()
export class UsersElevationService {
  constructor(
    private prisma: PrismaService,
    private usersHelper: UsersHelper,
    private timezoneHelper: TimezoneHelper,
  ) {}

  async requestElevation(userId: string, reason: string) {
    const existing = await this.prisma.elevationRequest.findUnique({
      where: { userId },
    });

    if (existing && existing.status === 'PENDING')
      throw new ConflictException(
        'You already have a pending elevation request',
      );

    return this.prisma.elevationRequest.upsert({
      where: { userId },
      create: { userId, reason },
      update: { reason, status: 'PENDING', reviewedAt: null, reviewNote: null },
    });
  }

  async elevationRequest(userId: string) {
    const [requests, timezone] = await Promise.all([
      this.prisma.elevationRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      this.timezoneHelper.forUser(userId),
    ]);

    return {
      requests: requests.map((r) => ({
        ...this.usersHelper.mapRequest(r, timezone),
      })),
    };
  }
}
