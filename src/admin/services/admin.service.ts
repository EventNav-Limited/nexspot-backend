import { Injectable } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '../../lib/error.lib.js';
import { PrismaService } from '../../config/prisma.service.js';
import { Role } from '../../generated/prisma/enums.js';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Admin approves an elevation request — promotes user to ORGANIZER.
   */
  async approveElevation(requestId: string) {
    const request = await this.prisma.elevationRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Elevation request not found');
    if (request.status !== 'PENDING')
      throw new BadRequestException('Request is no longer pending');

    await this.prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: request.userId },
        data: { role: Role.ORGANIZER },
      });

      await tx.elevationRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      });
    });
  }

  /**
   * Admin rejects an elevation request with an optional note.
   */
  async rejectElevation(requestId: string, reviewNote?: string) {
    const request = await this.prisma.elevationRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Elevation request not found');
    if (request.status !== 'PENDING')
      throw new BadRequestException('Request is no longer pending');

    await this.prisma.elevationRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', reviewedAt: new Date(), reviewNote },
    });
  }

  /**
   * Admin fetches all elevation requests, optionally filtered by status.
   */
  async getElevationRequests(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return await this.prisma.elevationRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhotoURL: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
