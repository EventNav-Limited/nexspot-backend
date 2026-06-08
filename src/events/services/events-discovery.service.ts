import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service.js';
import { EventStatus } from '../../generated/prisma/enums.js';
import { mapEvent } from '../event.helpers.js';
import { TimezoneHelper } from '../../lib/timezone.helper.js';
import { NotFoundException } from '../../lib/error.lib.js';
import { GetEventsDto } from '../dto/get-events.dto.js';

@Injectable()
export class EventsDiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timezoneHelper: TimezoneHelper,
  ) {}

  async getEvents(dto: GetEventsDto, userId?: string) {
    const timezone = await this.timezoneHelper.forOptionalUser(userId);
    const {
      page = 1,
      per_page = 20,
      q,
      category_id,
      format_id,
      date_from,
      date_to,
      location,
    } = dto;
    const skip = (page - 1) * per_page;

    const where: any = { status: EventStatus.PUBLISHED };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (category_id) where.categoryId = category_id;
    if (format_id) where.formatId = format_id;
    if (date_from) where.startDate = { gte: new Date(date_from) };
    if (date_to) where.endDate = { ...where.endDate, lte: new Date(date_to) };
    if (location) {
      where.location = {
        path: ['city'],
        equals: location,
      };
    }

    const [events, total] = await Promise.all([
      this.prisma.events.findMany({
        where,
        skip,
        take: per_page,
        orderBy: { startDate: 'asc' },
        include: { tickets: true, organizer: true },
      }),
      this.prisma.events.count({ where }),
    ]);

    const total_pages = Math.ceil(total / per_page);

    return {
      events: events.map((e) => mapEvent(e as any, timezone)),
      pagination: {
        current_page: page,
        per_page,
        total_items: total,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1,
      },
    };
  }

  async getRecommendedEvents(userId: string) {
    const [userInterests, location, timezone] = await Promise.all([
      this.prisma.userInterest.findMany({
        where: { userId },
        select: { interestId: true },
      }),
      this.prisma.contact.findUnique({
        where: { userId },
        select: { city: true, country: true },
      }),
      this.timezoneHelper.forUser(userId),
    ]);

    const interestIds = userInterests.map((ui) => ui.interestId);
    let events: any[] = [];

    if (interestIds.length > 0 || location) {
      const where: any = {
        status: EventStatus.PUBLISHED,
        endDate: { gte: new Date() },
      };

      if (interestIds.length > 0 && location) {
        where.OR = [
          { categoryId: { in: interestIds } },
          {
            location: {
              path: ['city'],
              equals: location.city,
            },
          },
        ];
      } else if (interestIds.length > 0) {
        where.categoryId = { in: interestIds };
      } else if (location) {
        where.location = {
          path: ['city'],
          equals: location.city,
        };
      }

      events = await this.prisma.events.findMany({
        where,
        take: 10,
        orderBy: { startDate: 'asc' },
        include: { tickets: true, organizer: true },
      });
    }

    // fallback to generic upcoming if not enough recommendations
    if (events.length < 5) {
      const fallbackEvents = await this.prisma.events.findMany({
        where: {
          status: EventStatus.PUBLISHED,
          endDate: { gte: new Date() },
          id: { notIn: events.map((e) => e.id) },
        },
        take: 10 - events.length,
        orderBy: { startDate: 'asc' },
        include: { tickets: true, organizer: true },
      });
      events = [...events, ...fallbackEvents];
    }

    return events.map((e) => mapEvent(e, timezone));
  }

  async getEventBySlug(slug: string, userId?: string) {
    const timezone = await this.timezoneHelper.forOptionalUser(userId);

    const event = await this.prisma.events.findUnique({
      where: { slug },
      include: {
        tickets: true,
        category: true,
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoURL: true,
          },
        },
      },
    });

    if (!event || event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Event not found or not published');
    }

    return mapEvent(event as any, timezone);
  }
}
