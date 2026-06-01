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
import {
  formatDateDisplay,
  generateSlug,
  mapEvent,
  resolveDateRange,
} from './event.helpers.js';
import { GetEventsNearMeDto } from './dto/get-events-near-me.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { SetTicketingDto, TicketType } from './dto/set-ticketing.dto.js';

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
   * Updates an event. Only the owning organizer can update.
   * Cannot update a CANCELLED or COMPLETED event.
   */
  async updateEvent(organizerId: string, eventId: string, dto: UpdateEventDto) {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');
    if (
      event.status != EventStatus.CANCELLED &&
      event.status != EventStatus.COMPLETED
    )
      throw new BadRequestException(
        `Cannot update a ${event.status.toLowerCase()} event`,
      );

    const updated = await this.prisma.events.update({
      where: { id: eventId },
      data: {
        ...dto,
        // re-generate slug if title changed
        ...(dto.title && { slug: generateSlug(dto.title) }),
      },
      include: { tickets: true, organizer: true },
    });

    return mapEvent(updated);
  }

  /**
   * Sets the ticketing configuration for an event.
   * Free events get a single free tier.
   * Paid events replace all existing tiers with the provided ones.
   * Blocked if any existing tier has recorded sales.
   */
  async setTicketing(
    organizerId: string,
    eventId: string,
    dto: SetTicketingDto,
  ) {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      include: { tickets: true },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');
    if (
      event.status === EventStatus.COMPLETED ||
      event.status === EventStatus.CANCELLED
    )
      throw new BadRequestException(
        `Cannot update ticketing for a ${event.status.toLowerCase()} event`,
      );

    // block replacement if any tier has sales — prevents data inconsistency
    const hasSales = event.tickets.some((t) => t.sold > 0);
    if (hasSales)
      throw new BadRequestException(
        'Cannot replace ticket tiers — some tickets have already been sold',
      );

    return this.prisma.$transaction(async (tx) => {
      // delete all existing tiers before replacing
      await tx.tickets.deleteMany({ where: { eventId } });

      if (dto.type === TicketType.FREE) {
        await tx.tickets.create({
          data: {
            eventId,
            name: 'Free',
            price: 0,
            quantity: event.capacity ?? 1000,
            sold: 0,
          },
        });
      } else {
        await tx.tickets.createMany({
          data: dto.tiers!.map((tier) => ({
            eventId,
            name: tier.name,
            price: tier.price,
            quantity: tier.quantity,
            sold: 0,
          })),
        });
      }

      return tx.events.findUnique({
        where: { id: eventId },
        include: { tickets: true, organizer: true },
      });
    });
  }

  /**
   * Returns the full event object plus a completeness check.
   * isComplete is true only when all required fields are present and valid.
   * missingFields lists exactly what is blocking publishing.
   */
  async reviewEvent(organizerId: string, eventId: string) {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      include: { tickets: true, organizer: true },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');

    const missingFields: string[] = [];

    if (!event.title) missingFields.push('title');
    if (!event.bannerURL) missingFields.push('banner');
    if (event.tickets.length === 0)
      missingFields.push('at least one ticket type');
    if (!event.startDate || new Date(event.startDate) <= new Date())
      missingFields.push('start date must be in the future');
    if (event.deliveryMode === EventFormat.IN_PERSON && !event.location)
      missingFields.push('location');
    if (event.deliveryMode === EventFormat.ONLINE && !event.onlineLink)
      missingFields.push('online link');

    return {
      ...mapEvent(event),
      isComplete: missingFields.length === 0,
      missingFields,
    };
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

  /**
   * Explicitly saves the current state as DRAFT.
   * No-op if already a DRAFT — returns current state.
   * Cannot save as draft if PUBLISHED, CANCELLED, or COMPLETED.
   */
  async saveDraft(organizerId: string, eventId: string) {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      include: { tickets: true, organizer: true },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');
    if (event.status !== EventStatus.DRAFT)
      throw new BadRequestException(
        `Cannot save as draft — event is ${event.status.toLowerCase()}`,
      );

    // already a draft — nothing to update, just return current state
    return mapEvent(event);
  }

  /**
   * Permanently deletes a DRAFT event.
   * Cannot delete PUBLISHED, CANCELLED, or COMPLETED events.
   */
  async deleteEvent(organizerId: string, eventId: string) {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');
    if (event.status !== EventStatus.DRAFT)
      throw new BadRequestException('Only draft events can be deleted');

    await this.prisma.events.delete({ where: { id: eventId } });
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
   * Returns published in-person and hybrid events within a given radius
   * of the provided coordinates, ordered by distance ascending.
   * Falls back to the user's saved contact coordinates if no lat/lng is provided.
   * Uses the Haversine formula for distance calculation.
   */
  async getEventsNearMe(userId: string | null, query: GetEventsNearMeDto) {
    // resolve coordinates — query params take priority over saved contact
    let lat = query.lat;
    let lng = query.lng;

    if (!lat || !lng) {
      if (!userId) {
        throw new BadRequestException(
          'Location required. Please provide lat and lng or log in with saved coordinates.',
        );
      }

      const contact = await this.prisma.contact.findUnique({
        where: { userId },
        select: { latitude: true, longitude: true },
      });

      if (!contact?.latitude || !contact?.longitude) {
        throw new BadRequestException(
          'No coordinates found. Please provide lat and lng or update your profile location.',
        );
      }

      lat = contact.latitude;
      lng = contact.longitude;
    }

    const radius = Math.max(1, Math.min(query.radius ?? 10, 100)); // cap at 100km
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.min(50, Math.max(1, query.per_page ?? 20));
    const skip = (page - 1) * perPage;

    // Haversine formula — calculates great-circle distance between two coordinate pairs
    // 6371 is Earth's radius in kilometers
    const events = await this.prisma.$queryRaw<any[]>`
      SELECT
        id, title, slug, banner_url,
        category_id, format_id, delivery_mode, status,
        start_date, end_date, location, latitude, longitude,
        distance_km
      FROM (
        SELECT
          id, title, slug, banner_url,
          category_id, format_id, delivery_mode, status,
          start_date, end_date, location, latitude, longitude,
          (
            6371 * acos(
              cos(radians(${lat})) * cos(radians(latitude)) *
              cos(radians(longitude) - radians(${lng})) +
              sin(radians(${lat})) * sin(radians(latitude))
            )
          ) AS distance_km
        FROM events
        WHERE status = 'PUBLISHED'
          AND delivery_mode != 'ONLINE'
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
      ) AS events_with_distance
      WHERE distance_km < ${radius}
      ORDER BY distance_km ASC
      LIMIT ${perPage} OFFSET ${skip}
    `;

    // get total count for pagination
    const total = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM (
        SELECT
          (
            6371 * acos(
              cos(radians(${lat})) * cos(radians(latitude)) *
              cos(radians(longitude) - radians(${lng})) +
              sin(radians(${lat})) * sin(radians(latitude))
            )
          ) AS distance_km
        FROM events
        WHERE status = 'PUBLISHED'
          AND delivery_mode != 'ONLINE'
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
      ) AS events_with_distance
      WHERE distance_km < ${radius}
    `;

    const totalItems = Number(total[0]?.count ?? 0);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        banner_url: e.banner_url,
        category_id: e.category_id,
        format_id: e.format_id,
        format: e.delivery_mode,
        status: e.status,
        date: {
          start: e.start_date,
          end: e.end_date,
          display: formatDateDisplay(e.start_date, e.end_date),
        },
        location: {
          display: e.location,
          distance_km: Math.round(e.distance_km * 10) / 10 + 'km',
        }, // round to 1 decimal
      })),
      pagination: {
        current_page: page,
        per_page: perPage,
        total_items: totalItems,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
      coordinates_used: { lat, lng },
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

  /**
   * Updates a ticket type.
   * Cannot reduce quantity below number already sold.
   */
  async updateTicket(
    organizerId: string,
    ticketId: string,
    dto: UpdateTicketDto,
  ) {
    const ticket = await this.prisma.tickets.findUnique({
      where: { id: ticketId },
      include: { event: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');

    // cannot reduce quantity below what has already been sold
    if (dto.quantity !== undefined && dto.quantity < ticket.sold) {
      throw new BadRequestException(
        `Cannot reduce quantity below ${ticket.sold} (already sold)`,
      );
    }

    return this.prisma.tickets.update({
      where: { id: ticketId },
      data: dto,
    });
  }

  /**
   * Deletes a ticket type.
   * Cannot delete if any tickets have been sold.
   */
  async deleteTicket(organizerId: string, ticketId: string) {
    const ticket = await this.prisma.tickets.findUnique({
      where: { id: ticketId },
      include: { event: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.event.organizerId !== organizerId)
      throw new ForbiddenException('You do not own this event');
    if (ticket.sold > 0)
      throw new BadRequestException(
        'Cannot delete a ticket type that has already been sold',
      );

    await this.prisma.tickets.delete({ where: { id: ticketId } });
  }
}
