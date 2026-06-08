import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service.js';
import { TimezoneHelper } from '../../lib/timezone.helper.js';
import { OrderStatus } from '../../generated/prisma/enums.js';
import { GetMyEventsDto } from '../dto/get-my-events.dto.js';
import { mapEvent } from '../../events/event.helpers.js';

@Injectable()
export class UsersActivityService {
  constructor(
    private prisma: PrismaService,
    private timezoneHelper: TimezoneHelper,
  ) {}

  async getMyEvents(organizerId: string, query: GetMyEventsDto) {
    const [timezone, total] = await Promise.all([
      this.timezoneHelper.forUser(organizerId),
      this.prisma.events.count({
        where: {
          organizerId,
          ...(query.status && { status: query.status }),
        },
      }),
    ]);

    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.min(50, Math.max(1, query.per_page ?? 20));
    const skip = (page - 1) * perPage;

    const where = {
      organizerId,
      ...(query.status && { status: query.status }),
    };

    const events = await this.prisma.events.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        tickets: true,
        _count: {
          select: {
            orders: {
              where: { status: OrderStatus.CONFIRMED },
            },
          },
        },
      },
    });

    const totalPages = Math.ceil(total / perPage);

    return {
      events: events.map((e) => ({
        ...mapEvent(e as any, timezone),
        confirmed_orders: e._count.orders,
      })),
      pagination: {
        current_page: page,
        per_page: perPage,
        total_items: total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  async getMyOrders(userId: string) {
    return this.prisma.orders.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDate: true,
            endDate: true,
            location: true,
            bannerURL: true,
          },
        },
        items: {
          include: {
            ticket: { select: { id: true, name: true, price: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
