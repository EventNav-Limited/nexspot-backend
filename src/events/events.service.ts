import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../lib/error.lib.js';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { EventFormat, EventStatus } from '../generated/prisma/enums.js';
import { GetEventsDto, PriceFilter, SortOrder } from './dto/get-events.dto.js';
import { PrismaService } from '../config/prisma.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { generateSlug, mapEvent, resolveDateRange } from './event.helpers.js';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new event in DRAFT status.
   * Only organizers can call this.
   */
  async createEvent(organizerId: string, dto: CreateEventDto) {
    // validate that end date is after start date
    if (dto.endDate <= dto.startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // online events must have a link; in-person events must have a location
    if (dto.deliveryMode === EventFormat.ONLINE && !dto.onlineLink) {
      throw new BadRequestException('Online events must have an online link');
    }
    if (dto.deliveryMode === EventFormat.IN_PERSON && !dto.location) {
      throw new BadRequestException('In-person events must have a location');
    }

    const slug = generateSlug(dto.title);

    const event = await this.prisma.events.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        startDate: dto.startDate,
        endDate: dto.endDate,
        location: dto.location,
        onlineLink: dto.onlineLink,
        capacity: dto.capacity,
        bannerURL: dto.bannerURL,
        deliveryMode: dto.deliveryMode,
        categoryId: dto.categoryId,
        formatId: dto.formatId,
        organizerId,
        status: EventStatus.DRAFT,
      },
      include: { tickets: true, organizer: true },
    });

    return mapEvent(event);
  }

  /**
   * Publishes an event — moves it from DRAFT to PUBLISHED.
   * Requires at least one ticket type to be defined.
   */
  async publishEvent(organizerId: string, eventId: string) {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      include: { tickets: true },
    });

    if (!event) throw new NotFoundException('Event');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');
    if (event.status !== EventStatus.DRAFT)
      throw new BadRequestException('Only draft events can be published');
    if (event.tickets.length === 0)
      throw new BadRequestException(
        'Add at least one ticket type before publishing',
      );

    const updated = await this.prisma.events.update({
      where: { id: eventId },
      data: { status: EventStatus.PUBLISHED },
      include: { tickets: true, organizer: true },
    });

    return mapEvent(updated);
  }

  // ─── Event Discovery (Public) ─────────────────────────────────────────────

  /**
   * Returns paginated published events with filtering and sorting.
   */
  async getEvents(dto: GetEventsDto) {
    const page = Math.max(1, dto.page ?? 1);
    const perPage = Math.min(50, Math.max(1, dto.per_page ?? 20));
    const skip = (page - 1) * perPage;

    // resolve date range from preset or custom range
    const dateRange = resolveDateRange(dto.date, dto.date_from, dto.date_to);

    // build the where clause dynamically
    const where: any = {
      status: EventStatus.PUBLISHED,

      // full-text search on title and description
      ...(dto.q && {
        OR: [
          { title: { contains: dto.q, mode: 'insensitive' } },
          { description: { contains: dto.q, mode: 'insensitive' } },
        ],
      }),

      // location filter
      ...(dto.location && {
        location: { contains: dto.location, mode: 'insensitive' },
      }),

      // category filter
      ...(dto.category_id && { categoryId: dto.category_id }),

      // format filter
      ...(dto.format_id && { formatId: dto.format_id }),

      // date range filter on startDate
      ...(Object.keys(dateRange).length > 0 && {
        startDate: dateRange,
      }),

      // price filter — check against related tickets
      ...(dto.price === PriceFilter.FREE && {
        tickets: { every: { price: Prisma.Decimal(0) } },
      }),
      ...(dto.price === PriceFilter.PAID && {
        tickets: { some: { price: { gt: Prisma.Decimal(0) } } },
      }),
    };

    // build the orderBy clause
    let orderBy: any = { startDate: 'asc' }; // default for relevance
    if (dto.sort === SortOrder.DATE) orderBy = { startDate: 'asc' };
    // price sorting requires sorting by related ticket — handled post-query
    // for price_asc/price_desc we fetch then sort in memory

    const [events, total] = await Promise.all([
      this.prisma.events.findMany({
        where,
        orderBy,
        skip,
        take: perPage,
        include: {
          tickets: true,
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoURL: true,
            },
          },
        },
      }),
      this.prisma.events.count({ where }),
    ]);

    const mapped = events.map((e) => mapEvent(e));

    // sort by price in memory since it's derived from tickets
    if (dto.sort === SortOrder.PRICE_ASC) {
      mapped.sort((a, b) => a.ticket.min_price - b.ticket.min_price);
    } else if (dto.sort === SortOrder.PRICE_DESC) {
      mapped.sort((a, b) => b.ticket.max_price - a.ticket.max_price);
    }

    const totalPages = Math.ceil(total / perPage);

    return {
      events: mapped,
      pagination: {
        current_page: page,
        per_page: perPage,
        total_items: total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
      applied_filters: {
        q: dto.q ?? null,
        price: dto.price ?? null,
        date: dto.date ?? null,
        category_id: dto.category_id ?? null,
        format_id: dto.format_id ?? null,
        sort: dto.sort ?? 'relevance',
      },
    };
  }

  /**
   * Returns a single published event by slug.
   */
  async getEvent(slug: string) {
    const event = await this.prisma.events.findUnique({
      where: { slug },
      include: {
        tickets: true,
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

    if (!event || event.status !== EventStatus.PUBLISHED)
      throw new NotFoundException('Event not found');

    return mapEvent(event);
  }

  // ─── Ticket Management (Organizer) ───────────────────────────────────────

  /**
   * Adds a ticket type to an event.
   * Can only add tickets to DRAFT or PUBLISHED events.
   */
  async addTicket(organizerId: string, eventId: string, dto: CreateTicketDto) {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');
    if (
      event.status === EventStatus.CANCELLED ||
      event.status === EventStatus.COMPLETED
    ) {
      throw new BadRequestException('Cannot add tickets to this event');
    }

    return this.prisma.tickets.create({
      data: {
        name: dto.name,
        price: dto.price,
        quantity: dto.quantity,
        eventId,
      },
    });
  }
}
